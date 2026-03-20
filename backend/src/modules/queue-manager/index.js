/**
 * QUEUE MANAGER MODULE
 * Handles the approval workflow: notifications, deadlines,
 * auto-posting logic, and the post review queue.
 */

const { Resend } = require('resend');
const axios = require('axios');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Send approval notification to user ───────────────────────────────────
async function sendApprovalNotification(userId, postId) {
  try {
    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) return;

    // Get post details
    const { data: post } = await supabase
      .from('post_queue')
      .select('*')
      .eq('id', postId)
      .single();

    if (!post) return;

    // Get settings to check approval mode
    const { data: settings } = await supabase
      .from('post_schedule_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Send email notification
    await sendApprovalEmail(email, post, settings);

    // Send push notification via OneSignal
    await sendPushNotification(userId, post);

    logger.info(`Approval notification sent to ${email} for post ${postId}`);
  } catch (e) {
    logger.error(`Failed to send approval notification:`, e.message);
  }
}

// ── Send approval email with preview ─────────────────────────────────────
async function sendApprovalEmail(email, post, settings) {
  const approveUrl = `${process.env.FRONTEND_URL}/queue/${post.id}?action=approve`;
  const reviewUrl = `${process.env.FRONTEND_URL}/queue/${post.id}`;
  const deadlineHours = settings?.review_deadline_hours || 4;

  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `✦ New post ready for review — ${post.graphic_headline}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0a0a0f; color: #f0eff8; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="background: #13131a; border-top: 3px solid #7c6fe8; border-radius: 12px; padding: 24px; margin-bottom: 20px; text-align: center;">
      <p style="color: #c47ef4; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.1em;">Zeneth Reach AI</p>
      <h1 style="color: #f0eff8; font-size: 22px; margin: 0;">Your post is ready for review</h1>
    </div>

    <!-- Post preview -->
    <div style="background: #13131a; border: 1px solid #2a2a35; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
      <p style="color: #8a88a0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px;">Post Preview</p>
      
      <div style="background: linear-gradient(135deg, #7c6fe8, #c47ef4); border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 16px;">
        <h2 style="color: white; margin: 0 0 6px; font-size: 18px;">${post.graphic_headline}</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 13px;">${post.graphic_subheadline}</p>
      </div>

      <p style="color: #8a88a0; font-size: 11px; text-transform: uppercase; margin: 0 0 6px;">LinkedIn Caption</p>
      <p style="color: #f0eff8; font-size: 13px; line-height: 1.6; background: #18181f; padding: 12px; border-radius: 8px; margin: 0 0 16px;">${(post.linkedin_caption || '').substring(0, 300)}...</p>

      <p style="color: #8a88a0; font-size: 11px; text-transform: uppercase; margin: 0 0 6px;">Scheduled for</p>
      <p style="color: #3ecfb2; font-size: 13px; font-weight: bold; margin: 0;">${new Date(post.scheduled_for).toLocaleString()}</p>
    </div>

    <!-- Deadline notice -->
    <div style="background: rgba(240,185,58,0.08); border: 1px solid rgba(240,185,58,0.2); border-radius: 10px; padding: 14px; margin-bottom: 20px; text-align: center;">
      <p style="color: #f0b93a; font-size: 12px; margin: 0;">⏰ Review deadline: ${deadlineHours} hours before post time. After that, it ${settings?.if_not_reviewed === 'skip' ? 'will be skipped' : 'will auto-post'}.</p>
    </div>

    <!-- Action buttons -->
    <div style="display: flex; gap: 12px; margin-bottom: 24px;">
      <a href="${approveUrl}" style="flex: 1; background: #4fd98a; color: #0a0a0f; padding: 14px; border-radius: 10px; text-align: center; text-decoration: none; font-weight: bold; font-size: 14px; display: block;">✓ Approve & Schedule</a>
      <a href="${reviewUrl}" style="flex: 1; background: #18181f; color: #f0eff8; padding: 14px; border-radius: 10px; text-align: center; text-decoration: none; font-size: 14px; border: 1px solid #2a2a35; display: block;">Edit Post</a>
    </div>

    <p style="text-align: center; color: #8a88a0; font-size: 11px;">Zeneth Reach AI · Zeneth Pro LLC · reuben@zenethpro.com</p>
  </div>
</body>
</html>
    `
  });
}

// ── Send push notification via OneSignal ──────────────────────────────────
async function sendPushNotification(userId, post) {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) return;

  try {
    await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: process.env.ONESIGNAL_APP_ID,
        filters: [{ field: 'tag', key: 'user_id', relation: '=', value: userId }],
        headings: { en: 'Zeneth Reach AI ✦' },
        contents: { en: `New post ready: "${post.graphic_headline}" — tap to review` },
        data: { post_id: post.id, type: 'post_review' },
        url: `${process.env.FRONTEND_URL}/queue/${post.id}`,
      },
      {
        headers: {
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (e) {
    logger.debug('OneSignal push failed:', e.message);
  }
}

// ── Check for posts past their review deadline ────────────────────────────
async function processDeadlines() {
  const { data: pendingPosts } = await supabase
    .from('post_queue')
    .select('*, post_schedule_settings!inner(*)')
    .eq('status', 'pending');

  if (!pendingPosts?.length) return;

  for (const post of pendingPosts) {
    const settings = post.post_schedule_settings;
    const deadlineHours = settings?.review_deadline_hours || 4;
    const deadline = new Date(post.scheduled_for);
    deadline.setHours(deadline.getHours() - deadlineHours);

    if (new Date() > deadline) {
      if (settings?.if_not_reviewed === 'skip') {
        await supabase.from('post_queue').update({ status: 'discarded' }).eq('id', post.id);
        logger.info(`Post ${post.id} skipped (deadline passed, skip mode)`);
      } else {
        await supabase.from('post_queue').update({ status: 'scheduled' }).eq('id', post.id);
        logger.info(`Post ${post.id} auto-scheduled (deadline passed, auto-post mode)`);
      }
    }
  }
}

module.exports = { sendApprovalNotification, processDeadlines };
