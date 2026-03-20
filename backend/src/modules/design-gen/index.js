/**
 * DESIGN GENERATION MODULE
 * Integrates with Canva Connect API to auto-generate
 * branded graphics for every post.
 */

const axios = require('axios');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const CANVA_API = 'https://api.canva.com/rest/v1';

// ── Generate a graphic for a post ─────────────────────────────────────────
async function generateGraphic(userId, postId, headline, subheadline) {
  // Get user's Canva credentials
  const { data: canvaAuth } = await supabase
    .from('canva_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!canvaAuth?.access_token) {
    logger.info(`No Canva token for user ${userId} — skipping graphic generation`);
    return null;
  }

  // Get user's brand templates
  const { data: profile } = await supabase
    .from('brand_profiles')
    .select('canva_template_ids')
    .eq('user_id', userId)
    .single();

  const templateId = profile?.canva_template_ids?.[0];
  if (!templateId) {
    logger.info(`No Canva template configured for user ${userId}`);
    return null;
  }

  try {
    // Refresh token if needed
    const accessToken = await refreshCanvaTokenIfNeeded(userId, canvaAuth);

    // Step 1: Create autofill job
    const autofillResponse = await axios.post(
      `${CANVA_API}/autofills`,
      {
        brand_template_id: templateId,
        data: {
          HEADLINE: { type: 'text', text: headline },
          SUBHEADLINE: { type: 'text', text: subheadline },
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const jobId = autofillResponse.data?.job?.id;
    if (!jobId) throw new Error('Canva autofill did not return a job ID');

    // Step 2: Wait for autofill to complete (poll)
    const designId = await pollAutofillJob(jobId, accessToken);

    // Step 3: Export to PNG
    const imageUrl = await exportDesign(designId, accessToken);

    // Step 4: Update post with image URL
    await supabase
      .from('post_queue')
      .update({ image_url: imageUrl })
      .eq('id', postId);

    logger.info(`Canva graphic generated for post ${postId}`);
    return imageUrl;

  } catch (err) {
    logger.error(`Canva API error for post ${postId}:`, err.message);
    return null;
  }
}

// ── Poll autofill job until complete ──────────────────────────────────────
async function pollAutofillJob(jobId, accessToken, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000); // Wait 2 seconds between polls

    const response = await axios.get(
      `${CANVA_API}/autofills/${jobId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const job = response.data?.job;
    if (job?.status === 'success') return job.result?.design?.id;
    if (job?.status === 'failed') throw new Error('Canva autofill job failed');
  }
  throw new Error('Canva autofill timed out');
}

// ── Export a Canva design to PNG ──────────────────────────────────────────
async function exportDesign(designId, accessToken) {
  // Create export job
  const exportResponse = await axios.post(
    `${CANVA_API}/exports`,
    {
      design_id: designId,
      format: 'png',
      export_quality: 'regular',
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );

  const jobId = exportResponse.data?.job?.id;
  if (!jobId) throw new Error('Canva export did not return a job ID');

  // Poll for completion
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const poll = await axios.get(
      `${CANVA_API}/exports/${jobId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const job = poll.data?.job;
    if (job?.status === 'success') return job.urls?.[0];
    if (job?.status === 'failed') throw new Error('Canva export failed');
  }
  throw new Error('Canva export timed out');
}

// ── OAuth: Exchange code for tokens ──────────────────────────────────────
async function exchangeCanvaCode(userId, code) {
  const response = await axios.post('https://api.canva.com/rest/v1/oauth/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.CANVA_REDIRECT_URI,
    client_id: process.env.CANVA_CLIENT_ID,
    client_secret: process.env.CANVA_CLIENT_SECRET,
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabase.from('canva_tokens').upsert({
    user_id: userId,
    access_token,
    refresh_token,
    expires_at: expiresAt,
  }, { onConflict: 'user_id' });

  return access_token;
}

// ── Refresh Canva token if expired ────────────────────────────────────────
async function refreshCanvaTokenIfNeeded(userId, canvaAuth) {
  const now = new Date();
  const expiresAt = new Date(canvaAuth.expires_at);

  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return canvaAuth.access_token; // Still valid
  }

  // Refresh
  const response = await axios.post('https://api.canva.com/rest/v1/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: canvaAuth.refresh_token,
    client_id: process.env.CANVA_CLIENT_ID,
    client_secret: process.env.CANVA_CLIENT_SECRET,
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt2 = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabase.from('canva_tokens').update({
    access_token,
    refresh_token,
    expires_at: expiresAt2,
  }).eq('user_id', userId);

  return access_token;
}

// ── Get user's Canva templates ────────────────────────────────────────────
async function getUserTemplates(userId) {
  const { data: canvaAuth } = await supabase
    .from('canva_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!canvaAuth?.access_token) return [];

  const accessToken = await refreshCanvaTokenIfNeeded(userId, canvaAuth);

  const response = await axios.get(`${CANVA_API}/brand-templates`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.data?.items || [];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { generateGraphic, exchangeCanvaCode, getUserTemplates };
