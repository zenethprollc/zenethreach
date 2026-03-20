const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { exchangeCanvaCode, getUserTemplates } = require('../modules/design-gen');

const router = express.Router();
router.use(authMiddleware);

router.get('/auth-url', (req, res) => {
  const url = `https://www.canva.com/api/oauth/authorize?client_id=${process.env.CANVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.CANVA_REDIRECT_URI)}&response_type=code&scope=asset:read%20design:read%20design:write`;
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    await exchangeCanvaCode(req.userId, code);
    res.redirect(`${process.env.FRONTEND_URL}/canva?connected=true`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/canva?error=canva_failed`);
  }
});

router.get('/templates', async (req, res) => {
  try {
    const templates = await getUserTemplates(req.userId);
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/templates', async (req, res) => {
  const { template_ids } = req.body;
  const { error } = await supabase.from('brand_profiles')
    .update({ canva_template_ids: template_ids })
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Templates saved' });
});

module.exports = router;
