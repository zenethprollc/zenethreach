/**
 * ANALYTICS MODULE
 * Fetches engagement data from Buffer every 6 hours.
 * Feeds the AI learning loop to improve future posts.
 */

const axios = require('axios');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const BUFFER_API = 'https://api.bufferapp.com/1';

// ── Main cron entry point ─────────────────────────────────────────────────
async function runAnalytics() {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('onboarding_complete', true);

  if (!users?.length) return;

  for (const user of users) {
    try {
      await fetchUserAnalytics(user.id);
      await updateLearningLoop(user.id);
    } catch (e) {
      logger.error(`Analytics failed for user ${user.id}:`, e.message);
    }
  }
}

// ── Fetch engagement data for published posts ─────────────────────────────
async function fetchUserAnalytics(userId) {
  const { data: bufferAuth } = await supabase
    .from('buffer_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!bufferAuth?.access_token) return;

  // Get recently published posts
  const { data: posts } = await supabase
    .from('post_queue')
    .select('id, buffer_update_ids, target_platforms')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!posts?.length) return;

  for (const post of posts) {
    const updates = post.buffer_update_ids || [];
    for (const update of updates) {
      try {
        const stats = await fetchBufferStats(bufferAuth.access_token, update.buffer_id);
        if (!stats) continue;

        const engagementRate = stats.reach > 0
          ? ((stats.likes + stats.comments + stats.shares) / stats.reach * 100).toFixed(2)
          : 0;

        await supabase.from('post_analytics').upsert({
          post_id: post.id,
          user_id: userId,
          platform: update.platform,
          reach: stats.reach || 0,
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          shares: stats.shares || 0,
          clicks: stats.clicks || 0,
          engagement_rate: parseFloat(engagementRate),
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'post_id,platform' });

      } catch (e) {
        logger.debug(`Could not fetch stats for update ${update.buffer_id}`);
      }
    }
  }
}

// ── Fetch stats for a single Buffer update ────────────────────────────────
async function fetchBufferStats(accessToken, updateId) {
  try {
    const response = await axios.get(
      `${BUFFER_API}/updates/${updateId}.json?access_token=${accessToken}`,
      { timeout: 5000 }
    );
    const update = response.data;
    return {
      reach: update.statistics?.reach || update.statistics?.impressions || 0,
      likes: update.statistics?.likes || update.statistics?.favorites || 0,
      comments: update.statistics?.comments || 0,
      shares: update.statistics?.shares || update.statistics?.retweets || 0,
      clicks: update.statistics?.clicks || 0,
    };
  } catch {
    return null;
  }
}

// ── AI Learning Loop: update user preferences from performance data ───────
async function updateLearningLoop(userId) {
  // Get analytics for last 30 days
  const { data: analytics } = await supabase
    .from('post_analytics')
    .select('*, post_queue(content_type, hashtags, scheduled_for)')
    .eq('user_id', userId)
    .order('engagement_rate', { ascending: false });

  if (!analytics?.length) return;

  // Find best performing content type
  const typeScores = {};
  const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const row of analytics) {
    const type = row.post_queue?.content_type;
    if (type) {
      if (!typeScores[type]) typeScores[type] = [];
      typeScores[type].push(row.engagement_rate);
    }

    if (row.post_queue?.scheduled_for) {
      const day = new Date(row.post_queue.scheduled_for).getDay();
      dayScores[day].push(row.engagement_rate);
    }
  }

  // Calculate averages
  const bestContentType = Object.entries(typeScores)
    .map(([type, rates]) => ({ type, avg: rates.reduce((a, b) => a + b, 0) / rates.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.type;

  const bestDay = Object.entries(dayScores)
    .filter(([, rates]) => rates.length > 0)
    .map(([day, rates]) => ({ day: parseInt(day), avg: rates.reduce((a, b) => a + b, 0) / rates.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.day;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Update settings with learned preferences
  const updates = {};
  if (bestContentType) updates.best_content_type = bestContentType;
  if (bestDay !== undefined) updates.learned_best_day = dayNames[bestDay];

  if (Object.keys(updates).length > 0) {
    await supabase.from('post_schedule_settings')
      .update(updates)
      .eq('user_id', userId);

    logger.info(`Learning loop updated for user ${userId}: best type=${bestContentType}, best day=${dayNames[bestDay]}`);
  }
}

// ── Get analytics summary for dashboard ──────────────────────────────────
async function getAnalyticsSummary(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('post_analytics')
    .select('reach, likes, comments, shares, engagement_rate, platform')
    .eq('user_id', userId)
    .gte('fetched_at', thirtyDaysAgo);

  if (!data?.length) return { reach: 0, engagement_rate: 0, total_posts: 0, by_platform: {} };

  const totals = data.reduce((acc, row) => ({
    reach: acc.reach + row.reach,
    likes: acc.likes + row.likes,
    comments: acc.comments + row.comments,
    shares: acc.shares + row.shares,
  }), { reach: 0, likes: 0, comments: 0, shares: 0 });

  const avgEngagement = (data.reduce((a, r) => a + r.engagement_rate, 0) / data.length).toFixed(2);

  const byPlatform = {};
  for (const row of data) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = { reach: 0, posts: 0 };
    byPlatform[row.platform].reach += row.reach;
    byPlatform[row.platform].posts++;
  }

  return { ...totals, engagement_rate: parseFloat(avgEngagement), total_posts: data.length, by_platform: byPlatform };
}

module.exports = { runAnalytics, getAnalyticsSummary };
