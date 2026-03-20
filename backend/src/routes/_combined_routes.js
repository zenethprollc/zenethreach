// ============================================================
// SCHEDULE ROUTES — /api/settings/schedule
// ============================================================
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { getAnalyticsSummary } = require('../modules/analytics');
const { exchangeBufferCode } = require('../modules/publisher');
const { exchangeCanvaCode, getUserTemplates } = require('../modules/design-gen');

// Schedule
const scheduleRouter = express.Router();
scheduleRouter.use(authMiddleware);

scheduleRouter.get('/schedule', async (req, res) => {
  const { data } = await supabase.from('post_schedule_settings').select('*').eq('user_id', req.userId).single();
  res.json(data || {});
});

scheduleRouter.put('/schedule', async (req, res) => {
  const { data, error } = await supabase.from('post_schedule_settings')
    .upsert({ ...req.body, user_id: req.userId }, { onConflict: 'user_id' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

scheduleRouter.post('/autopilot/toggle', async (req, res) => {
  const { enabled } = req.body;
  await supabase.from('post_schedule_settings').upsert({ user_id: req.userId, autopilot_enabled: enabled }, { onConflict: 'user_id' });
  res.json({ autopilot_enabled: enabled });
});

// ============================================================
// ANALYTICS ROUTES — /api/analytics
// ============================================================
const analyticsRouter = express.Router();
analyticsRouter.use(authMiddleware);

analyticsRouter.get('/summary', async (req, res) => {
  const summary = await getAnalyticsSummary(req.userId);
  res.json(summary);
});

analyticsRouter.get('/posts', async (req, res) => {
  const { data } = await supabase.from('post_analytics').select('*, post_queue(graphic_headline, content_type)')
    .eq('user_id', req.userId).order('engagement_rate', { ascending: false }).limit(20);
  res.json(data || []);
});

analyticsRouter.get('/platforms', async (req, res) => {
  const { data } = await supabase.from('post_analytics').select('platform, reach, engagement_rate')
    .eq('user_id', req.userId);
  const byPlatform = {};
  for (const row of (data || [])) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = { reach: 0, posts: 0, total_engagement: 0 };
    byPlatform[row.platform].reach += row.reach;
    byPlatform[row.platform].posts++;
    byPlatform[row.platform].total_engagement += row.engagement_rate;
  }
  res.json(byPlatform);
});

// ============================================================
// CHANNELS ROUTES — /api/channels
// ============================================================
const channelsRouter = express.Router();
channelsRouter.use(authMiddleware);

channelsRouter.get('/', async (req, res) => {
  const { data } = await supabase.from('connected_channels').select('*').eq('user_id', req.userId);
  res.json(data || []);
});

channelsRouter.get('/buffer/auth-url', (req, res) => {
  const url = `https://bufferapp.com/oauth2/authorize?client_id=${process.env.BUFFER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.BUFFER_REDIRECT_URI)}&response_type=code`;
  res.json({ url });
});

channelsRouter.get('/buffer/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const profiles = await exchangeBufferCode(req.userId, code);
    res.redirect(`${process.env.FRONTEND_URL}/channels?connected=true&count=${profiles.length}`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/channels?error=buffer_failed`);
  }
});

channelsRouter.patch('/:id/toggle', async (req, res) => {
  const { is_active } = req.body;
  await supabase.from('connected_channels').update({ is_active }).eq('id', req.params.id).eq('user_id', req.userId);
  res.json({ is_active });
});

channelsRouter.delete('/:id', async (req, res) => {
  await supabase.from('connected_channels').delete().eq('id', req.params.id).eq('user_id', req.userId);
  res.json({ message: 'Channel disconnected' });
});

// ============================================================
// CANVA ROUTES — /api/canva
// ============================================================
const canvaRouter = express.Router();
canvaRouter.use(authMiddleware);

canvaRouter.get('/auth-url', (req, res) => {
  const url = `https://www.canva.com/api/oauth/authorize?client_id=${process.env.CANVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.CANVA_REDIRECT_URI)}&response_type=code&scope=asset:read%20design:read%20design:write`;
  res.json({ url });
});

canvaRouter.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    await exchangeCanvaCode(req.userId, code);
    res.redirect(`${process.env.FRONTEND_URL}/canva?connected=true`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/canva?error=canva_failed`);
  }
});

canvaRouter.get('/templates', async (req, res) => {
  try {
    const templates = await getUserTemplates(req.userId);
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

canvaRouter.put('/templates', async (req, res) => {
  const { template_ids } = req.body;
  await supabase.from('brand_profiles').update({ canva_template_ids: template_ids }).eq('user_id', req.userId);
  res.json({ message: 'Templates saved' });
});

module.exports = { scheduleRouter, analyticsRouter, channelsRouter, canvaRouter };
