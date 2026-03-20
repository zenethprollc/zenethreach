const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { scanWebsite } = require('../modules/brand-scanner');

const router = express.Router();
router.use(authMiddleware);

// POST /api/onboarding/scan - kick off website scan
router.post('/scan', async (req, res) => {
  const { website_url } = req.body;
  if (!website_url) return res.status(400).json({ error: 'website_url is required' });

  res.json({ message: 'Scan started — check /api/brand for results in ~30 seconds' });

  // Run scan asynchronously
  scanWebsite(req.userId, website_url)
    .then(() => {
      // Mark onboarding step complete
      supabase.from('users').update({ website_scanned: true }).eq('id', req.userId);
    })
    .catch(e => console.error('Scan error:', e.message));
});

// GET /api/onboarding/status
router.get('/status', async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', req.userId).single();
  const { data: profile } = await supabase.from('brand_profiles').select('company_name').eq('user_id', req.userId).single();
  const { data: channels } = await supabase.from('connected_channels').select('id').eq('user_id', req.userId);
  const { data: settings } = await supabase.from('post_schedule_settings').select('id').eq('user_id', req.userId).single();

  res.json({
    website_scanned: !!profile?.company_name,
    channels_connected: (channels?.length || 0) > 0,
    schedule_set: !!settings,
    onboarding_complete: user?.onboarding_complete || false,
  });
});

// POST /api/onboarding/complete
router.post('/complete', async (req, res) => {
  await supabase.from('users').update({ onboarding_complete: true }).eq('id', req.userId);
  res.json({ message: 'Onboarding complete — autopilot is now active' });
});

module.exports = router;
