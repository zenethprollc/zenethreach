const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { exchangeBufferCode } = require('../modules/publisher');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data } = await supabase.from('connected_channels').select('*').eq('user_id', req.userId);
  res.json(data || []);
});

router.get('/buffer/auth-url', (req, res) => {
  const url = `https://bufferapp.com/oauth2/authorize?client_id=${process.env.BUFFER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.BUFFER_REDIRECT_URI)}&response_type=code`;
  res.json({ url });
});

router.get('/buffer/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const profiles = await exchangeBufferCode(req.userId, code);
    res.redirect(`${process.env.FRONTEND_URL}/channels?connected=true&count=${profiles.length}`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/channels?error=buffer_failed`);
  }
});

router.patch('/:id/toggle', async (req, res) => {
  const { is_active } = req.body;
  await supabase.from('connected_channels').update({ is_active })
    .eq('id', req.params.id).eq('user_id', req.userId);
  res.json({ is_active });
});

router.delete('/:id', async (req, res) => {
  await supabase.from('connected_channels').delete()
    .eq('id', req.params.id).eq('user_id', req.userId);
  res.json({ message: 'Channel disconnected' });
});

module.exports = router;
