const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { generatePost } = require('../modules/content-gen');

const router = express.Router();
router.use(authMiddleware);

// GET /api/queue - list all queue items
router.get('/', async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;
  let query = supabase.from('post_queue').select('*', { count: 'exact' })
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data, total: count });
});

// GET /api/queue/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('post_queue').select('*')
    .eq('id', req.params.id).eq('user_id', req.userId).single();
  if (error) return res.status(404).json({ error: 'Post not found' });
  res.json(data);
});

// PATCH /api/queue/:id - edit post
router.patch('/:id', async (req, res) => {
  const allowed = ['linkedin_caption', 'instagram_caption', 'facebook_caption', 'tiktok_caption',
    'hashtags', 'target_platforms', 'scheduled_for', 'graphic_headline', 'graphic_subheadline'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const { data, error } = await supabase.from('post_queue').update(updates)
    .eq('id', req.params.id).eq('user_id', req.userId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/queue/:id/approve
router.post('/:id/approve', async (req, res) => {
  const { data, error } = await supabase.from('post_queue')
    .update({ status: 'scheduled', approved_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('user_id', req.userId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Post approved and scheduled', post: data });
});

// POST /api/queue/:id/discard
router.post('/:id/discard', async (req, res) => {
  await supabase.from('post_queue').update({ status: 'discarded' })
    .eq('id', req.params.id).eq('user_id', req.userId);
  res.json({ message: 'Post discarded' });
});

// POST /api/queue/generate - manually trigger post generation
router.post('/generate', async (req, res) => {
  const { content_type = 'trend_response', trend_id } = req.body;
  try {
    res.json({ message: 'Post generation started — check queue in ~15 seconds' });
    await generatePost(req.userId, trend_id, content_type);
  } catch (e) {
    // Already responded — just log
    console.error('Manual generation failed:', e.message);
  }
});

module.exports = router;
