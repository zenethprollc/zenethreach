const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();
router.use(authMiddleware);

router.get('/schedule', async (req, res) => {
  const { data } = await supabase.from('post_schedule_settings').select('*').eq('user_id', req.userId).single();
  res.json(data || {});
});

router.put('/schedule', async (req, res) => {
  const { data, error } = await supabase.from('post_schedule_settings')
    .upsert({ ...req.body, user_id: req.userId }, { onConflict: 'user_id' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/autopilot/toggle', async (req, res) => {
  const { enabled } = req.body;
  await supabase.from('post_schedule_settings')
    .upsert({ user_id: req.userId, autopilot_enabled: enabled }, { onConflict: 'user_id' });
  res.json({ autopilot_enabled: enabled });
});

module.exports = router;
