-- ============================================================
-- ZENETH REACH AI — DATABASE SCHEMA
-- ============================================================
-- Paste this entire file into Supabase > SQL Editor > Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  plan TEXT DEFAULT 'free',
  timezone TEXT DEFAULT 'America/New_York',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  website_scanned BOOLEAN DEFAULT FALSE
);

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

CREATE TABLE IF NOT EXISTS public.buffer_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.canva_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buffer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "brand_own" ON public.brand_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "channels_own" ON public.connected_channels FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "buffer_own" ON public.buffer_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "canva_own" ON public.canva_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "schedule_own" ON public.post_schedule_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trends_own" ON public.trend_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "queue_own" ON public.post_queue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "analytics_own" ON public.post_analytics FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_queue_user_status ON public.post_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_post_queue_scheduled ON public.post_queue(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_trend_cache_user_unused ON public.trend_cache(user_id, used, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user ON public.post_analytics(user_id);
