/**
 * CONTENT GENERATION MODULE
 * The core AI engine. Takes a brand profile + trend and generates
 * complete post content for all platforms using Claude AI.
 * Then triggers Canva graphic generation.
 */

const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');
const { getHashtags } = require('../trend-engine');
const { generateGraphic } = require('../design-gen');
const { sendApprovalNotification } = require('../queue-manager');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Main cron entry point ─────────────────────────────────────────────────
async function runContentGeneration() {
  // Get all users with autopilot enabled and onboarding complete
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('onboarding_complete', true);

  if (!users?.length) return;

  for (const user of users) {
    try {
      await generateForUser(user.id);
    } catch (e) {
      logger.error(`Content gen failed for user ${user.id}:`, e.message);
    }
  }
}

// ── Check if user needs a new post and generate one ──────────────────────
async function generateForUser(userId) {
  // Get schedule settings
  const { data: settings } = await supabase
    .from('post_schedule_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!settings?.autopilot_enabled) return;

  // Check how many posts are already queued or scheduled for this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('post_queue')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())
    .in('status', ['pending', 'approved', 'scheduled']);

  if (count >= (settings.posts_per_week || 2)) return; // Already at quota

  // Get a fresh unused trend
  const { data: trend } = await supabase
    .from('trend_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('used', false)
    .gte('relevance_score', 60)
    .order('relevance_score', { ascending: false })
    .limit(1)
    .single();

  if (!trend) {
    logger.info(`No unused trends for user ${userId}`);
    return;
  }

  // Generate the post
  await generatePost(userId, trend.id, 'trend_response');
}

// ── Generate a complete post (caption + graphic) ──────────────────────────
async function generatePost(userId, trendId, contentType = 'trend_response') {
  // Get brand profile
  const { data: profile } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) throw new Error(`No brand profile for user ${userId}`);

  // Get trend data
  const { data: trend } = await supabase
    .from('trend_cache')
    .select('*')
    .eq('id', trendId)
    .single();

  // Get schedule settings for approval mode
  const { data: settings } = await supabase
    .from('post_schedule_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  logger.info(`Generating ${contentType} post for user ${userId}`);

  // ── Build prompts ──────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(profile);
  const userPrompt = buildUserPrompt(profile, trend, contentType);

  // ── Call Claude API ────────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for content generation');

  const content = JSON.parse(jsonMatch[0]);

  // ── Get hashtags ───────────────────────────────────────────────────────
  const hashtags = await getHashtags(trend?.trend_title || profile.industry);

  // ── Calculate scheduled time ───────────────────────────────────────────
  const scheduledFor = calculateNextPostTime(settings);

  // ── Save post to queue ─────────────────────────────────────────────────
  const { data: post, error } = await supabase
    .from('post_queue')
    .insert({
      user_id: userId,
      trend_id: trendId,
      content_type: contentType,
      linkedin_caption: content.linkedin_caption,
      instagram_caption: content.instagram_caption,
      facebook_caption: content.facebook_caption,
      tiktok_caption: content.tiktok_caption,
      graphic_headline: content.graphic_headline,
      graphic_subheadline: content.graphic_subheadline,
      hashtags,
      target_platforms: ['linkedin', 'instagram', 'facebook'],
      status: 'pending',
      scheduled_for: scheduledFor,
    })
    .select()
    .single();

  if (error) throw error;

  // Mark trend as used
  await supabase.from('trend_cache').update({ used: true }).eq('id', trendId);

  // ── Generate Canva graphic ─────────────────────────────────────────────
  try {
    await generateGraphic(userId, post.id, content.graphic_headline, content.graphic_subheadline);
  } catch (e) {
    logger.error(`Canva graphic generation failed for post ${post.id}:`, e.message);
    // Continue — post still goes to queue even without image
  }

  // ── Handle approval mode ───────────────────────────────────────────────
  if (settings?.approval_mode === 'auto') {
    await supabase.from('post_queue')
      .update({ status: 'scheduled' })
      .eq('id', post.id);
    logger.info(`Post ${post.id} auto-scheduled for ${scheduledFor}`);
  } else {
    // Send notification for review
    await sendApprovalNotification(userId, post.id);
  }

  return post;
}

// ── Prompt builders ───────────────────────────────────────────────────────
function buildSystemPrompt(profile) {
  return `You are an expert social media marketer for ${profile.company_name}.

Company overview: ${profile.tagline}
Services offered: ${(profile.services || []).join(', ')}
Target audience: ${profile.target_audience}
Industry: ${profile.industry}
Brand tone: ${profile.tone}
Key differentiators: ${(profile.key_differentiators || []).join(', ')}
${profile.example_post ? `\nExample post style (match this voice exactly):\n"${profile.example_post}"` : ''}

Always write as the company voice. Focus on value and results for the target audience. Never sound generic.`;
}

function buildUserPrompt(profile, trend, contentType) {
  const trendContext = trend
    ? `Trending topic: "${trend.trend_title}"\nAngle to use: ${trend.angle}\nSuggested hook: ${trend.post_hook}`
    : `Create a service spotlight post about: ${(profile.services || [])[0] || profile.company_name}`;

  const typeInstructions = {
    trend_response: 'Connect this trend directly to how your company can help. Show relevance and expertise.',
    educational: 'Share a practical tip or insight your audience can use today. Position company as the expert.',
    service_spotlight: 'Highlight one specific service with clear benefits and a strong call to action.',
    case_study: 'Share a results-focused post. Use numbers and outcomes. Build credibility.',
  };

  return `${trendContext}

Post type: ${contentType}
Instruction: ${typeInstructions[contentType] || typeInstructions.trend_response}

Generate posts for all platforms. Return ONLY this JSON structure (no other text):
{
  "linkedin_caption": "Professional, story-led post (max 1500 chars). Start with a strong hook. Use line breaks. End with a question or CTA. No hashtags here.",
  "instagram_caption": "Visual-first, punchy post (max 800 chars). Strong first line. Relatable tone. End with CTA. No hashtags here.",
  "facebook_caption": "Conversational, shareable post (max 500 chars). Easy to read. Question-driven.",
  "tiktok_caption": "Very casual, trend-aware (max 150 chars). Hook in first 5 words.",
  "graphic_headline": "Short bold headline for the Canva graphic (max 8 words)",
  "graphic_subheadline": "Supporting line for graphic (max 12 words)"
}`;
}

// ── Calculate the next optimal posting time ───────────────────────────────
function calculateNextPostTime(settings) {
  const now = new Date();
  const postTime = settings?.post_time || '14:00:00';
  const preferredDays = settings?.preferred_days || ['tuesday', 'thursday'];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Find the next preferred day
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    const dayName = dayNames[candidate.getDay()];

    if (preferredDays.includes(dayName)) {
      const [hours, minutes] = postTime.split(':');
      candidate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (candidate > now) return candidate.toISOString();
    }
  }

  // Fallback: 24 hours from now
  const fallback = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return fallback.toISOString();
}

module.exports = { runContentGeneration, generatePost, generateForUser };
