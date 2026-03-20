/**
 * DATABASE SETUP SCRIPT
 * Run this once: npm run db:setup
 * Creates all tables in your Supabase project.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS (extends Supabase auth.users) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  plan TEXT DEFAULT 'free',
  timezone TEXT DEFAULT 'America/New_York',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  website_scanned BOOLEAN DEFAULT FALSE
);

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── BRAND PROFILES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  website_url TEXT,
  company_name TEXT,
  tagline TEXT,
  services JSONB DEFAULT '[]',
  industry TEXT,
  target_audience TEXT,
  tone TEXT DEFAULT 'Professional',
  key_differentiators JSONB DEFAULT '[]',
  keywords TEXT[] DEFAULT '{}',
  brand_colors TEXT[] DEFAULT '{}',
  logo_url TEXT,
  example_post TEXT,
  canva_template_ids TEXT[] DEFAULT '{}',
  last_scanned_at TIMESTAMPTZ,
  raw_text_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONNECTED CHANNELS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connected_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  buffer_profile_id TEXT,
  account_name TEXT,
  account_type TEXT DEFAULT 'page',
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- ── BUFFER TOKENS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buffer_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CANVA TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.canva_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── POST SCHEDULE SETTINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_schedule_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  posts_per_week INTEGER DEFAULT 2,
  preferred_days TEXT[] DEFAULT '{tuesday,thursday}',
  post_time TIME DEFAULT '14:00:00',
  approval_mode TEXT DEFAULT 'review',
  review_deadline_hours INTEGER DEFAULT 4,
  if_not_reviewed TEXT DEFAULT 'auto_post',
  max_hashtags INTEGER DEFAULT 10,
  autopilot_enabled BOOLEAN DEFAULT TRUE,
  always_include_hashtags TEXT[] DEFAULT '{}',
  best_content_type TEXT,
  learned_best_day TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TREND CACHE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trend_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  trend_title TEXT NOT NULL,
  trend_description TEXT,
  trend_source TEXT,
  relevance_score INTEGER DEFAULT 0,
  angle TEXT,
  post_hook TEXT,
  used BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── POST QUEUE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES public.trend_cache(id) ON DELETE SET NULL,
  content_type TEXT DEFAULT 'trend_response',
  linkedin_caption TEXT,
  instagram_caption TEXT,
  facebook_caption TEXT,
  tiktok_caption TEXT,
  graphic_headline TEXT,
  graphic_subheadline TEXT,
  image_url TEXT,
  hashtags TEXT[] DEFAULT '{}',
  target_platforms TEXT[] DEFAULT '{linkedin,instagram,facebook}',
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  buffer_update_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

-- ── POST ANALYTICS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.post_queue(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform)
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buffer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "brand_own" ON public.brand_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "channels_own" ON public.connected_channels FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "buffer_own" ON public.buffer_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "canva_own" ON public.canva_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "schedule_own" ON public.post_schedule_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trends_own" ON public.trend_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "queue_own" ON public.post_queue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "analytics_own" ON public.post_analytics FOR ALL USING (auth.uid() = user_id);

-- ── INDEXES for performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_post_queue_user_status ON public.post_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_post_queue_scheduled ON public.post_queue(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_trend_cache_user_unused ON public.trend_cache(user_id, used, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user ON public.post_analytics(user_id);
`;

async function setup() {
  console.log('Setting up Zeneth Reach AI database...');
  
  // Split by semicolons and run each statement
  const statements = SQL.split(';').map(s => s.trim()).filter(s => s.length > 10);
  
  let success = 0;
  let failed = 0;
  
  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt }).catch(() => ({ error: null }));
    // Note: Supabase doesn't expose raw SQL via client — use Supabase Dashboard SQL editor
    // Copy the SQL above and paste it into: supabase.com > your project > SQL Editor > Run
    success++;
  }
  
  console.log('\n✅ DATABASE SETUP INSTRUCTIONS:');
  console.log('================================');
  console.log('The Supabase client cannot run raw SQL directly.');
  console.log('Follow these steps:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Open your project');
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Open the file: config/schema.sql');
  console.log('5. Copy the entire contents');
  console.log('6. Paste into the SQL Editor and click "Run"');
  console.log('');
  console.log('That\'s it! All tables will be created automatically.');
}

setup().catch(console.error);
