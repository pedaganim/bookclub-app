const { success, error } = require('../../lib/response');
const { sendEmail } = require('../../lib/notification-service');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    let authUser = null;
    try {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : (authHeader || null);
      if (token) {
        authUser = await User.getCurrentUser(token);
      }
    } catch (_) {
      // ignore auth failure; interest can be anonymous
    }

    let body = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch (_) {
      // ignore
    }

    const fromPage = body?.from || event?.headers?.Referer || event?.headers?.referer || '';
    const providedEmail = (body?.email && String(body.email).trim()) || '';

    // Validate email (optional but if provided, must be valid)
    if (providedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(providedEmail)) {
        return error('Invalid email address', 400);
      }
    }

    const subject = 'Swap Toys interest — BookClub';
    const lines = [
      `When: ${new Date().toISOString()}`,
      `From page: ${fromPage}`,
      authUser ? `User: ${authUser.name || ''} (${authUser.email || ''}) [${authUser.userId}]` : 'User: anonymous',
      providedEmail ? `Interested Email: ${providedEmail}` : null,
      `User Agent: ${event?.headers?.['User-Agent'] || event?.headers?.['user-agent'] || ''}`,
      `IP: ${event?.requestContext?.identity?.sourceIp || ''}`,
    ].filter(Boolean).join('\n');

    const text = `A user registered interest in Swap Toys.\n\n${lines}`;
    const html = `<p>A user registered interest in <strong>Swap Toys</strong>.</p><pre>${lines}</pre>`;

    // Send email (do not fail the whole request if SES fails)
    const to = process.env.ADMIN_NOTIFY_EMAIL || 'madhukar.pedagani@gmail.com';
    try {
      await sendEmail(to, subject, text, html);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Interest][SwapToys] Failed to send admin email', { error: e?.message || String(e), to, subject });
      // continue without failing
    }

    return success({ registered: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error registering interest:', e);
    return error('Failed to register interest', 500);
  }
};

