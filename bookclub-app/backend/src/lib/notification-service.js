const AWS = require('./aws-config');
const dynamoDb = require('./dynamodb');
const { getTableName } = require('./table-names');

// Low-cost SES mailer
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Notification types and defaults (all true by default)
const DEFAULT_PREFS = {
  new_book_from_followed_user: true,
  comment_on_your_book: true,
  reminder_due_date: true,
  new_member_in_your_club: true,
  club_announcement: true,
  dm_message_received: true,
};

async function getUserPrefs(userId) {
  const user = await dynamoDb.get(getTableName('users'), { userId });
  if (!user) return { emailOptIn: true, prefs: { ...DEFAULT_PREFS } };
  const emailOptIn = user.emailOptIn !== false; // default true
  const prefs = { ...DEFAULT_PREFS, ...(user.notificationPrefs || {}) };
  return { emailOptIn, prefs, email: user.email, name: user.name };
}

async function setUserPrefs(userId, { emailOptIn, prefs }) {
  const updates = {};
  if (typeof emailOptIn === 'boolean') updates.emailOptIn = emailOptIn;
  if (prefs && typeof prefs === 'object') updates.notificationPrefs = prefs;
  if (Object.keys(updates).length === 0) return await getUserPrefs(userId);

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
    dynamoDb.generateUpdateExpression({ ...updates, updatedAt: new Date().toISOString() });
  await dynamoDb.update({
    TableName: getTableName('users'),
    Key: { userId },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'NONE',
  });
  return await getUserPrefs(userId);
}

function renderTemplate(templateId, templateData) {
  // Simple minimal templates for Phase 1; can be migrated to files later
  switch (templateId) {
    case 'dm_message_received': {
      const { fromName = 'A user', snippet = '', conversationUrl = '' } = templateData || {};
      const subject = `New message from ${fromName}`;
      const text = `You have a new message from ${fromName} in BookClub.\n\n${snippet}\n\nOpen conversation: ${conversationUrl}`;
      const html = `<p>You have a new message from <strong>${fromName}</strong> in BookClub.</p><p>${snippet}</p><p><a href="${conversationUrl}">Open conversation</a></p>`;
      return { subject, text, html };
    }
    default: {
      const subject = 'BookClub notification';
      const text = 'You have a new notification.';
      const html = '<p>You have a new notification.</p>';
      return { subject, text, html };
    }
  }
}

async function sendEmail(to, subject, text, html) {
  const from = process.env.NOTIFY_FROM_EMAIL || 'notify@booklub.shop';
  const params = {
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text },
        Html: { Data: html },
      },
    },
  };
  try {
    const res = await ses.sendEmail(params).promise();
    // eslint-disable-next-line no-console
    console.log('[Notify][SES] Sent email', { to, messageId: res.MessageId });
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Notify][SES] Failed to send email', { to, subject, error: err && (err.message || err.code || String(err)) });
    throw err;
  }
}

async function sendEmailIfEnabled(userId, type, templateId, templateData) {
  const { emailOptIn, prefs, email, name } = await getUserPrefs(userId);
  if (!emailOptIn) {
    // eslint-disable-next-line no-console
    console.log('[Notify] Skipping email: user opted out', { userId, type });
    return { skipped: 'opted_out' };
  }
  if (!prefs[type]) {
    // eslint-disable-next-line no-console
    console.log('[Notify] Skipping email: type disabled', { userId, type });
    return { skipped: 'type_disabled' };
  }
  if (!email) {
    // eslint-disable-next-line no-console
    console.warn('[Notify] Skipping email: user has no email', { userId, type });
    return { skipped: 'no_email' };
  }
  const { subject, text, html } = renderTemplate(templateId, templateData);
  // eslint-disable-next-line no-console
  console.log('[Notify] Sending email', { userId, type, to: email, subject });
  await sendEmail(email, subject, text, html);
  return { sent: true };
}

// Admin notifications
async function sendAdminNewUserNotification(user) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || 'madhukar.pedagani@gmail.com';
  if (!to) return { skipped: 'no_admin_email' };
  const subject = `New user signed up: ${user?.name || user?.email || user?.userId || 'Unknown'}`;
  const lines = [
    `User ID: ${user?.userId || ''}`,
    `Name: ${user?.name || ''}`,
    `Email: ${user?.email || ''}`,
    `Created At: ${user?.createdAt || new Date().toISOString()}`,
  ].join('\n');
  const text = `A new user has signed up on BookClub.\n\n${lines}`;
  const html = `<p>A new user has signed up on BookClub.</p><pre>${lines}</pre>`;
  await sendEmail(to, subject, text, html);
  return { sent: true };
}

module.exports = {
  DEFAULT_PREFS,
  getUserPrefs,
  setUserPrefs,
  sendEmail,
  sendEmailIfEnabled,
  sendAdminNewUserNotification,
};
