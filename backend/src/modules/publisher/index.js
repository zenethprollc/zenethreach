/**
 * PUBLISHER MODULE
 * Runs every 15 minutes. Finds scheduled posts and
 * publishes them to all connected social platforms via Buffer API.
 */

const axios = require('axios');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const BUFFER_API = 'https://api.bufferapp.com/1';

// ── Main cron entry point ─────────────────────────────────────────────────
async function runPublisher() {
  const now = new Date().toISOString();

  // Find posts that are scheduled and due
  const { data: posts } = await supabase
    .from('post_queue')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now);

  if (!posts?.length) return;

  logger.info(`Publisher: ${posts.length} post(s) due for publishing`);

  for (const post of posts) {
    try {
      await publishPost(post);
    } catch (e) {
      logger.error(`Failed to publish post ${post.id}:`, e.message);
    }
  }
}

// ── Publish a single post to all target platforms ─────────────────────────
async function publishPost(post) {
  // Get user's Buffer credentials
  const { data: bufferAuth } = await supabase
    .from('buffer_tokens')
    .select('*')
    .eq('user_id', post.user_id)
    .single();

  if (!bufferAuth?.access_token) {
    logger.warn(`No Buffer token for user ${post.user_id} — marking post as failed`);
    await supabase.from('post_queue').update({ status: 'failed' }).eq('id', post.id);
    return;
  }

  // Get connected channels
  const { data: channels } = await supabase
    .from('connected_channels')
    .select('*')
    .eq('user_id', post.user_id)
    .eq('is_active', true)
    .in('platform', post.target_platforms || ['linkedin', 'instagram', 'facebook']);

  if (!channels?.length) {
    logger.warn(`No active channels for user ${post.user_id}`);
    return;
  }

  const bufferUpdates = [];

  for (const channel of channels) {
    const caption = getPlatformCaption(post, channel.platform);
    const hashtagStr = (post.hashtags || []).slice(0, getPlatformHashtagLimit(channel.platform)).join(' ');
    const fullCaption = `${caption}\n\n${hashtagStr}`.trim();

    try {
      const result = await sendToBuffer(
        bufferAuth.access_token,
        channel.buffer_profile_id,
        fullCaption,
        post.image_url,
        post.scheduled_for
      );

      bufferUpdates.push({ platform: channel.platform, buffer_id: result.id });
      logger.info(`Queued to Buffer: ${channel.platform} for post ${post.id}`);
    } catch (e) {
      logger.error(`Buffer publish failed for ${channel.platform}:`, e.message);
    }
  }

  // Update post status
  await supabase.from('post_queue').update({
    status: 'published',
    published_at: new Date().toISOString(),
    buffer_update_ids: bufferUpdates,
  }).eq('id', post.id);

  logger.info(`Post ${post.id} published to ${bufferUpdates.length} platform(s)`);
}

// ── Call Buffer API to create an update ──────────────────────────────────
async function sendToBuffer(accessToken, profileId, text, mediaUrl, scheduledTime) {
  const payload = {
    profile_ids: [profileId],
    text,
    scheduled_at: scheduledTime,
  };

  if (mediaUrl) {
    payload.media = { photo: mediaUrl };
  }

  const response = await axios.post(
    `${BUFFER_API}/updates/create.json`,
    new URLSearchParams({ ...flattenPayload(payload), access_token: accessToken }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data;
}

// ── Buffer OAuth: exchange code for token ─────────────────────────────────
async function exchangeBufferCode(userId, code) {
  const response = await axios.post(
    'https://api.bufferapp.com/1/oauth2/token.json',
    {
      client_id: process.env.BUFFER_CLIENT_ID,
      client_secret: process.env.BUFFER_CLIENT_SECRET,
      redirect_uri: process.env.BUFFER_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { access_token } = response.data;

  // Fetch user's profiles
  const profilesResp = await axios.get(
    `${BUFFER_API}/profiles.json?access_token=${access_token}`
  );

  const profiles = profilesResp.data || [];

  // Save token
  await supabase.from('buffer_tokens').upsert({
    user_id: userId,
    access_token,
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // Save each connected channel
  for (const profile of profiles) {
    const platform = detectPlatform(profile.service);
    if (!platform) continue;

    await supabase.from('connected_channels').upsert({
      user_id: userId,
      platform,
      buffer_profile_id: profile.id,
      account_name: profile.formatted_username || profile.service_username,
      account_type: profile.service_type || 'page',
      is_active: true,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });
  }

  return profiles;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getPlatformCaption(post, platform) {
  const map = {
    linkedin: post.linkedin_caption,
    instagram: post.instagram_caption,
    facebook: post.facebook_caption,
    tiktok: post.tiktok_caption,
    twitter: post.tiktok_caption, // Use short caption for X
  };
  return map[platform] || post.linkedin_caption;
}

function getPlatformHashtagLimit(platform) {
  const limits = { linkedin: 5, instagram: 15, facebook: 5, tiktok: 8, twitter: 3 };
  return limits[platform] || 5;
}

function detectPlatform(service) {
  const map = {
    linkedin: 'linkedin',
    instagram: 'instagram',
    facebook: 'facebook',
    tiktok: 'tiktok',
    twitter: 'twitter',
    pinterest: 'pinterest',
  };
  return map[service?.toLowerCase()];
}

function flattenPayload(obj, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(val)) {
      val.forEach((v, i) => { result[`${fullKey}[${i}]`] = v; });
    } else if (typeof val === 'object' && val !== null) {
      Object.assign(result, flattenPayload(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

module.exports = { runPublisher, publishPost, exchangeBufferCode };
