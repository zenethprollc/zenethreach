// ============================================================
// BRAND ROUTES
// ============================================================
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { scanWebsite } = require('../modules/brand-scanner');

const brandRouter = express.Router();
brandRouter.use(authMiddleware);

brandRouter.get('/', async (req, res) => {
  const { data, error } = await supabase.from('brand_profiles').select('*').eq('user_id', req.userId).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json(data || null);
});

brandRouter.put('/', async (req, res) => {
  const { data, error } = await supabase.from('brand_profiles')
    .upsert({ ...req.body, user_id: req.userId }, { onConflict: 'user_id' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

brandRouter.post('/rescan', async (req, res) => {
  const { data: profile } = await supabase.from('brand_profiles').select('website_url').eq('user_id', req.userId).single();
  if (!profile?.website_url) return res.status(400).json({ error: 'No website URL saved' });
  res.json({ message: 'Scan started' });
  scanWebsite(req.userId, profile.website_url).catch(() => {});
});

module.exports = brandRouter;

// ============================================================
// ONBOARDING ROUTES  
// ============================================================
// File: routes/onboarding.js (separate file below)
