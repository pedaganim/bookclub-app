const LocalStorage = require('../../lib/local-storage');
const User = require('../../models/user');
const dynamoDb = require('../../lib/dynamodb');
const { getTableName } = require('../../lib/table-names');
const response = require('../../lib/response');

const IS_LOCAL = process.env.APP_ENV === 'local';

// Auto-create the local dev user in DynamoDB on first login.
// This means a fresh machine with empty DynamoDB tables just works.
async function ensureLocalDevUser(email) {
  const userId = 'local-user';
  const timestamp = new Date().toISOString();
  const user = {
    userId,
    email,
    name: 'Local Dev',
    password: 'local',
    profilePicture: null,
    bio: null,
    role: 'user',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  try {
    await dynamoDb.put(getTableName('users'), user);
    console.log('[login] Auto-created local dev user in DynamoDB');
  } catch (e) {
    // ConditionalCheckFailedException means it already exists — that's fine
    if (e.code !== 'ConditionalCheckFailedException') {
      console.warn('[login] ensureLocalDevUser warning:', e.message);
    }
  }
  return user;
}

module.exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    console.log('Login attempt for:', data.email);

    // Validate input
    const errors = {};
    if (!data.email) errors.email = 'Email is required';
    if (!data.password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    // ── LOCAL DEV PATH ───────────────────────────────────────────────
    // Uses DynamoDB (localhost:8000). Auto-creates the dev user if the
    // table is empty (e.g. fresh machine, first boot).
    if (IS_LOCAL) {
      let user = await User.getByEmail(data.email).catch(() => null);

      if (!user) {
        console.log('[login] Local dev user not found — auto-creating...');
        user = await ensureLocalDevUser(data.email);
      }

      const userId = user.userId;
      const idToken = `local-id-${userId}`;
      const accessToken = `local-token-${userId}`;

      return response.success({
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture || null,
        },
        tokens: { idToken, accessToken, refreshToken: accessToken },
      });
    }

    // ── LEGACY JSON FILE PATH (tests / old offline mode) ────────────
    const user = await LocalStorage.getUserByEmail(data.email);
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return response.unauthorized('User not found');
    }

    const result = await LocalStorage.authenticateUser(data.email, data.password);

    if (!result) {
      return response.unauthorized('Incorrect email or password');
    }

    return response.success({
      user: {
        userId: result.user.userId,
        email: result.user.email,
        name: result.user.name,
        profilePicture: result.user.profilePicture,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return response.unauthorized(error.message);
  }
};

