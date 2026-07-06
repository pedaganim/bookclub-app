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
  club_join_approved: true,
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
    case 'club_join_request': {
      const { requesterName = 'A user', requesterEmail = '', clubName = 'your club', reviewUrl = '' } = templateData || {};
      const subject = `Join request for ${clubName}`;
      const text = `${requesterName}${requesterEmail ? ' <' + requesterEmail + '>' : ''} requested to join ${clubName}.\n\nReview and approve/reject: ${reviewUrl}`;
      const html = `<p><strong>${requesterName}</strong>${requesterEmail ? ' &lt;' + requesterEmail + '&gt;' : ''} requested to join <strong>${clubName}</strong>.</p>\n<p><a href="${reviewUrl}">Review and approve/reject</a></p>`;
      return { subject, text, html };
    }
    case 'club_join_approved': {
      const { clubName = 'a book club', clubUrl = '' } = templateData || {};
      const brand = process.env.BRAND_NAME || 'BookClub';
      const subject = `Your request to join "${clubName}" has been approved`;
      const text = `Great news! Your request to join the book club "${clubName}" on ${brand} has been approved. You can now access the club.${clubUrl ? '\n\nVisit the club: ' + clubUrl : ''}`;
      const html = `<p>Great news! Your request to join the book club <strong>${clubName}</strong> on ${brand} has been approved.</p><p>You can now access the club.${clubUrl ? ' <a href="' + clubUrl + '">Visit the club</a>' : ''}</p>`;
      return { subject, text, html };
    }
    case 'dm_message_received': {
      const { fromName = 'A user', snippet = '', conversationUrl = '' } = templateData || {};
      const brand = process.env.BRAND_NAME || 'BookClub';
      const subject = `New message from ${fromName}`;
      const text = `You have a new message from ${fromName} in ${brand}.\n\n${snippet}\n\nOpen conversation: ${conversationUrl}`;
      const html = `<p>You have a new message from <strong>${fromName}</strong> in ${brand}.</p><p>${snippet}</p><p><a href="${conversationUrl}">Open conversation</a></p>`;
      return { subject, text, html };
    }
    case 'club_invite': {
      const { inviterName = 'A user', clubName = 'a book club', inviteCode = '', joinUrl = '' } = templateData || {};
      const brand = process.env.BRAND_NAME || 'BookClub';
      const subject = `You are invited to join the book club "${clubName}"`;
      const text = `${inviterName} has invited you to join the book club "${clubName}" on ${brand}!\n\nTo join, go to ${joinUrl}. You will be joined automatically once you log in or sign up with this email address.\n\nHappy reading!`;
      const html = `<p><strong>${inviterName}</strong> has invited you to join the book club <strong>${clubName}</strong> on ${brand}!</p>\n<p>To join, <a href="${joinUrl}">click here to open the app</a>. You will be joined automatically once you log in or sign up with this email address.</p>\n<p>Happy reading!</p>`;
      return { subject, text, html };
    }
    case 'event_reminder': {
      const { eventTitle = 'An event', clubName = 'a book club', dateTime = '', description = '', eventUrl = '' } = templateData || {};
      const subject = `Reminder: "${eventTitle}" in ${clubName}`;
      // Basic formatting of the date-time string
      let formattedDate = dateTime;
      try {
        formattedDate = new Date(dateTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      } catch (e) {
        // Fallback to raw string if parsing fails
      }
      const text = `This is a reminder for the upcoming event "${eventTitle}" in "${clubName}"!\n\nWhen: ${formattedDate}\n\nDescription: ${description}\n\nView details: ${eventUrl}`;
      const html = `<p>This is a reminder for the upcoming event <strong>${eventTitle}</strong> in <strong>${clubName}</strong>!</p>
<p><strong>When:</strong> ${formattedDate}</p>
${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
<p><a href="${eventUrl}">View event details</a></p>`;
      return { subject, text, html };
    }
    default: {
      const brand = process.env.BRAND_NAME || 'BookClub';
      const subject = `${brand} notification`;
      const text = 'You have a new notification.';
      const html = '<p>You have a new notification.</p>';
      return { subject, text, html };
    }
  }
}

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true';

async function sendEmail(to, subject, text, html) {
  if (isOffline()) {
    // eslint-disable-next-line no-console
    console.log('[Notify][Offline] Skipped actual SES email send to:', to, '| Subject:', subject);
    return { MessageId: 'offline-mock-id' };
  }

  const from = process.env.NOTIFY_FROM_EMAIL;
  const recipientList = typeof to === 'string'
    ? to.split(',').map(email => email.trim()).filter(Boolean)
    : Array.isArray(to) ? to : [to];

  const params = {
    Source: from,
    Destination: { ToAddresses: recipientList },
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
  if (isOffline()) {
    // eslint-disable-next-line no-console
    console.log('[Notify][Offline] Skipped email check for user:', userId, type);
    return { sent: true };
  }
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
  const brand = process.env.BRAND_NAME || 'BookClub';
  const text = `A new user has signed up on ${brand}.\n\n${lines}`;
  const html = `<p>A new user has signed up on ${brand}.</p><pre>${lines}</pre>`;
  await sendEmail(to, subject, text, html);
  return { sent: true };
}

async function sendClubInvite({ to, inviterName, clubName, inviteCode }) {
  const baseUrl = process.env.SITE_BASE_URL || 'http://localhost:3000';
  const joinUrl = `${baseUrl.replace(/\/$/, '')}/clubs`;
  const { subject, text, html } = renderTemplate('club_invite', {
    inviterName,
    clubName,
    inviteCode,
    joinUrl,
  });
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
  sendClubInvite,
};
