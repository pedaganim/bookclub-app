const { success, error } = require('../../lib/response');
const { sendEmail } = require('../../lib/notification-service');
const User = require('../../models/user');

const VALID_TYPES = ['feedback', 'feature_request', 'bug_report', 'general'];

exports.handler = async (event) => {
  try {
    let authUser = null;
    try {
      const claims = event?.requestContext?.authorizer?.claims;
      if (claims?.sub) {
        authUser = await User.getById(claims.sub).catch(() => null);
      } else {
        const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : (authHeader || null);
        if (token && token !== 'null') {
          authUser = await User.getCurrentUser(token).catch(() => null);
        }
      }
    } catch (_) {
      // ignore auth failure; contact can be anonymous
    }

    let body = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch (_) {
      return error('Invalid JSON body', 400);
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const type = String(body.type || 'general').trim();
    const message = String(body.message || '').trim();

    if (!name) return error('Name is required', 400);
    if (!email) return error('Email is required', 400);
    if (!message) return error('Message is required', 400);
    if (message.length > 5000) return error('Message too long (max 5000 characters)', 400);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return error('Invalid email address', 400);

    const resolvedType = VALID_TYPES.includes(type) ? type : 'general';
    const typeLabels = {
      feedback: 'Feedback',
      feature_request: 'Feature Request',
      bug_report: 'Bug Report',
      general: 'General Inquiry',
    };
    const typeLabel = typeLabels[resolvedType];

    const recipientsRaw = process.env.CONTACT_RECIPIENTS || 'madhukar.goud@gmail.com,madhukar.pedagani@gmail.com';
    const recipients = recipientsRaw.split(',').map(r => r.trim()).filter(Boolean);

    const subject = `[BookClub Contact] ${typeLabel} from ${name}`;

    const userLine = authUser
      ? `Authenticated user: ${authUser.name || ''} (${authUser.email || ''}) [${authUser.userId}]`
      : 'Submitted anonymously';

    const lines = [
      `Type: ${typeLabel}`,
      `From: ${name} <${email}>`,
      userLine,
      `Submitted: ${new Date().toISOString()}`,
      '',
      'Message:',
      message,
    ].join('\n');

    const html = `
      <h2 style="color:#4f46e5">BookClub — ${typeLabel}</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600">Type</td><td>${typeLabel}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600">From</td><td>${name} &lt;${email}&gt;</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600">Account</td><td>${authUser ? `${authUser.name || ''} (${authUser.email || ''})` : 'Anonymous'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600">Submitted</td><td>${new Date().toISOString()}</td></tr>
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>
      <h3 style="color:#111827;margin-bottom:8px">Message</h3>
      <p style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;color:#374151">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    `;

    let sendErrors = 0;
    for (const recipient of recipients) {
      try {
        await sendEmail(recipient, subject, lines, html);
      } catch (e) {
        sendErrors++;
        console.error('[Contact] Failed to send to', recipient, e?.message || String(e));
      }
    }

    if (sendErrors === recipients.length) {
      return error('Failed to send message. Please try again later.', 500);
    }

    return success({ sent: true });
  } catch (e) {
    console.error('[Contact] Unexpected error:', e);
    return error('Failed to submit contact form', 500);
  }
};
