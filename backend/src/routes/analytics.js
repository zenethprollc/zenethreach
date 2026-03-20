const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAnalyticsSummary } = require('../modules/analytics');
const supabase = require('../lib/supabase');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  try {
    const summary = await getAnalyticsSummary(req.userId);
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/posts', async (req, res) => {
  const { data } = await supabase
    .from('post_analytics')
    .select('*, post_queue(graphic_headline, content_type, published_at)')
    .eq('user_id', req.userId)
    .order('engagement_rate', { ascending: false })
    .limit(20);
  res.json(data || []);
});

router.get('/platforms', async (req, res) => {
  const { data } = await supabase
    .from('post_analytics')
    .select('platform, reach, engagement_rate')
    .eq('user_id', req.userId);

  const byPlatform = {};
  for (const row of (data || [])) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = { reach: 0, posts: 0, avg_engagement: 0 };
    byPlatform[row.platform].reach += row.reach;
    byPlatform[row.platform].posts++;
    byPlatform[row.platform].avg_engagement += row.engagement_rate;
  }
  for (const p of Object.keys(byPlatform)) {
    byPlatform[p].avg_engagement = parseFloat((byPlatform[p].avg_engagement / byPlatform[p].posts).toFixed(2));
  }
  res.json(byPlatform);
});

module.exports = router;
