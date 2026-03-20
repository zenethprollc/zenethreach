/**
 * TREND ENGINE MODULE
 * Fetches trending news every 4 hours, scores each trend
 * against every user's brand profile using Claude AI,
 * and stores matched trends in the database.
 */

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Main cron entry point ─────────────────────────────────────────────────
async function runTrendFetch() {
  // 1. Fetch all active users who have completed onboarding
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .eq('onboarding_complete', true);

  if (error || !users?.length) return;

  // 2. Fetch trending topics once (shared for all users)
  const trends = await fetchTrends();
  logger.info(`Fetched ${trends.length} trends`);

  // 3. For each user, score trends against their brand profile
  for (const user of users) {
    try {
      await scoreAndStoreTrends(user.id, trends);
    } catch (e) {
      logger.error(`Trend scoring failed for user ${user.id}:`, e.message);
    }
  }
}

// ── Fetch trends from NewsAPI ─────────────────────────────────────────────
async function fetchTrends() {
  const trends = [];

  try {
    // NewsAPI - business + tech headlines
    const categories = ['business', 'technology'];
    for (const cat of categories) {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          category: cat,
          language: 'en',
          pageSize: 20,
          apiKey: process.env.NEWSAPI_KEY
        },
        timeout: 8000
      });

      if (response.data?.articles) {
        response.data.articles.forEach(article => {
          if (article.title && article.title !== '[Removed]') {
            trends.push({
              title: article.title,
              description: article.description || '',
              source: 'newsapi',
              category: cat,
              url: article.url,
              published_at: article.publishedAt
            });
          }
        });
      }
    }
  } catch (e) {
    logger.error('NewsAPI fetch failed:', e.message);
  }

  // Add marketing/automation specific topics if NewsAPI fails
  if (trends.length === 0) {
    trends.push(
      { title: 'AI automation tools transforming small businesses in 2025', source: 'fallback', category: 'technology' },
      { title: 'Social media marketing ROI hits record high for B2B companies', source: 'fallback', category: 'business' },
      { title: 'CRM software adoption grows 40% among service businesses', source: 'fallback', category: 'business' }
    );
  }

  return trends.slice(0, 30); // Max 30 trends per cycle
}

// ── Score trends against a user's brand profile using Claude ─────────────
async function scoreAndStoreTrends(userId, trends) {
  // Get brand profile
  const { data: profile } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return;

  // Only score top 15 trends per user to save API calls
  const trendsToScore = trends.slice(0, 15);

  const systemPrompt = `You are a social media strategist. Rate how relevant trending news topics are to a specific business. Return ONLY valid JSON arrays.`;

  const userPrompt = `Company: ${profile.company_name}
Services: ${(profile.services || []).join(', ')}
Industry: ${profile.industry}
Target audience: ${profile.target_audience}
Keywords: ${(profile.keywords || []).join(', ')}

Rate each of these trending topics (0-100) for how well they can be connected to this company's social media marketing:

${trendsToScore.map((t, i) => `${i + 1}. "${t.title}"`).join('\n')}

For each topic scoring 50+, provide:
- score (0-100)
- angle: how to connect this trend to the company's services  
- hook: an engaging first line for a social post about this trend

Return JSON array:
[{"index": 1, "score": 85, "angle": "...", "hook": "..."}, ...]

Only include items scoring 50 or higher.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const scored = JSON.parse(jsonMatch[0]);

    // Store matched trends in database
    for (const item of scored) {
      const trend = trendsToScore[item.index - 1];
      if (!trend) continue;

      await supabase.from('trend_cache').insert({
        user_id: userId,
        trend_title: trend.title,
        trend_description: trend.description || '',
        trend_source: trend.source,
        relevance_score: item.score,
        angle: item.angle,
        post_hook: item.hook,
        used: false,
        fetched_at: new Date().toISOString()
      });
    }

    logger.info(`Stored ${scored.length} matched trends for user ${userId}`);
  } catch (e) {
    logger.error(`Trend scoring API error for ${userId}:`, e.message);
  }
}

// ── Get trending hashtags for a topic via RiteTag ────────────────────────
async function getHashtags(topic, platform = 'linkedin') {
  try {
    const response = await axios.get('https://ritetag.com/best-hashtags-for-image', {
      params: { text: topic, token: process.env.RITETAG_API_KEY },
      timeout: 5000
    });

    if (response.data?.data) {
      return response.data.data
        .filter(h => h.color === 'green' || h.color === 'blue') // only good hashtags
        .slice(0, 10)
        .map(h => h.hashtag);
    }
  } catch (e) {
    logger.debug('RiteTag unavailable, using fallback hashtags');
  }

  // Fallback hashtags based on topic keywords
  return generateFallbackHashtags(topic);
}

function generateFallbackHashtags(topic) {
  const base = ['#Marketing', '#Business', '#Automation', '#AI', '#Growth', '#SocialMedia', '#DigitalMarketing'];
  const lower = topic.toLowerCase();
  const extra = [];
  if (lower.includes('ai') || lower.includes('artificial')) extra.push('#AIMarketing', '#AITools');
  if (lower.includes('crm') || lower.includes('customer')) extra.push('#CRM', '#CustomerSuccess');
  if (lower.includes('social') || lower.includes('linkedin')) extra.push('#LinkedInMarketing', '#ContentStrategy');
  if (lower.includes('automat')) extra.push('#MarketingAutomation', '#WorkflowAutomation');
  return [...extra, ...base].slice(0, 10);
}

module.exports = { runTrendFetch, fetchTrends, scoreAndStoreTrends, getHashtags };
