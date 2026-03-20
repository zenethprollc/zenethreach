require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const logger = require('./lib/logger');

// Routes
const authRoutes = require('./routes/auth');
const brandRoutes = require('./routes/brand');
const channelsRoutes = require('./routes/channels');
const queueRoutes = require('./routes/queue');
const scheduleRoutes = require('./routes/schedule');
const analyticsRoutes = require('./routes/analytics');
const canvaRoutes = require('./routes/canva');
const onboardingRoutes = require('./routes/onboarding');

// Cron jobs
const { runTrendFetch } = require('./modules/trend-engine');
const { runContentGeneration } = require('./modules/content-gen');
const { runPublisher } = require('./modules/publisher');
const { runAnalytics } = require('./modules/analytics');

const app = express();

// ── Security & Middleware ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/settings', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/canva', canvaRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Zeneth Reach AI' }));

// ── Error Handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Cron Jobs (the autopilot engine) ──────────────────────────────────────
// Fetch trends every 4 hours
cron.schedule('0 */4 * * *', async () => {
  logger.info('CRON: Starting trend fetch...');
  try { await runTrendFetch(); }
  catch (e) { logger.error('CRON trend fetch failed:', e.message); }
});

// Generate content every 4 hours (offset by 30min from trend fetch)
cron.schedule('30 */4 * * *', async () => {
  logger.info('CRON: Starting content generation...');
  try { await runContentGeneration(); }
  catch (e) { logger.error('CRON content gen failed:', e.message); }
});

// Check for posts to publish every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try { await runPublisher(); }
  catch (e) { logger.error('CRON publisher failed:', e.message); }
});

// Fetch analytics every 6 hours
cron.schedule('0 */6 * * *', async () => {
  logger.info('CRON: Fetching analytics...');
  try { await runAnalytics(); }
  catch (e) { logger.error('CRON analytics failed:', e.message); }
});

// ── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 Zeneth Reach AI backend running on port ${PORT}`);
  logger.info(`🤖 Autopilot cron jobs active`);
});

module.exports = app;
