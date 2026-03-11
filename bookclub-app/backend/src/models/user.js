const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');
const AWS = require('../lib/aws-config');
const { sendAdminNewUserNotification } = require('../lib/notification-service');

// Initialize Cognito
const cognito = new AWS.CognitoIdentityServiceProvider();

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class User {
  static async register(userData) {
    const userId = uuidv4();
    const timestamp = new Date().toISOString();
    const verificationToken = uuidv4();

    if (isOffline()) {
      const user = {
        userId,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || null,
        timezone: userData.timezone || 'UTC',
        emailVerified: false,
        verificationToken,
        onboardingCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await LocalStorage.createUser(user);
      return { ...user, password: undefined };
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    // Create user in Cognito
    const signUpParams = {
      ClientId: clientId,
      Username: userData.email,
      Password: userData.password,
      UserAttributes: [
        { Name: 'email', Value: userData.email },
        { Name: 'name', Value: userData.name },
      ],
    };

    try {
      await cognito.signUp(signUpParams).promise();
      await cognito.adminConfirmSignUp({ UserPoolId: userPoolId, Username: userData.email }).promise();

      const user = {
        userId,
        email: userData.email,
        name: userData.name,
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || null,
        timezone: userData.timezone || 'UTC',
        emailVerified: false,
        verificationToken,
        onboardingCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await dynamoDb.put(getTableName('users'), user);
      // Fire-and-forget admin notification
      try { await sendAdminNewUserNotification(user); } catch (e) { /* noop */ }
      return { ...user, password: undefined };
    } catch (error) {
      if (error.code === 'UsernameExistsException') {
        throw new Error('A user with this email already exists');
      }
      try {
        await cognito.adminDeleteUser({ UserPoolId: userPoolId, Username: userData.email }).promise();
      } catch (cleanupError) {
        console.error('Error cleaning up Cognito user:', cleanupError);
      }
      throw error;
    }
  }

  static async login(email, password) {
    if (isOffline()) {
      const result = await LocalStorage.authenticateUser(email, password);
      if (!result) throw new Error('Incorrect email or password');
      return { ...result.user, tokens: result.tokens };
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    };

    try {
      const response = await cognito.initiateAuth(params).promise();
      const user = await this.getByEmail(email);
      return {
        ...user,
        tokens: {
          accessToken: response.AuthenticationResult.AccessToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
          idToken: response.AuthenticationResult.IdToken,
          expiresIn: response.AuthenticationResult.ExpiresIn,
        },
      };
    } catch (error) {
      if (error.code === 'NotAuthorizedException' || error.code === 'UserNotFoundException') {
        throw new Error('Incorrect email or password');
      }
      throw error;
    }
  }

  static async getById(userId) {
    if (isOffline()) {
      return LocalStorage.getUserById(userId);
    }
    return dynamoDb.get(getTableName('users'), { userId });
  }

  static async getByEmail(email) {
    if (isOffline()) {
      return LocalStorage.getUserByEmail(email);
    }
    const params = {
      TableName: getTableName('users'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    };
    const result = await dynamoDb.query(params);
    return result[0] || null;
  }

  static async update(userId, updates) {
    const timestamp = new Date().toISOString();
    if (isOffline()) {
      const existing = await LocalStorage.getUserById(userId);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: timestamp };
      // Overwrite by email key
      await LocalStorage.createUser(updated);
      return { ...updated, password: undefined };
    }

    const updateData = { ...updates, updatedAt: timestamp };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updateData);
    const params = {
      TableName: getTableName('users'),
      Key: { userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async getCurrentUser(accessToken) {
    if (isOffline()) {
      const user = await LocalStorage.verifyToken(accessToken);
      if (!user) throw new Error('Invalid or expired token');
      return user;
    }
    try {
      const userData = await cognito.getUser({ AccessToken: accessToken }).promise();
      const email = userData.UserAttributes.find(attr => attr.Name === 'email').Value;
      return this.getByEmail(email);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Ensure a user record exists for a Cognito-hosted/IdP sign-in using claims
  // If not present, create a minimal record keyed by the Cognito 'sub'
  static async ensureExistsFromClaims(claims) {
    if (!claims || !claims.sub) return null;
    const userId = claims.sub;
    // Try by userId first
    let existing = await this.getById(userId);
    if (existing) return existing;

    // Derive fields from claims
    const email = claims.email || null;
    const name = claims.name || claims.given_name || (email ? email.split('@')[0] : 'User');
    const timestamp = new Date().toISOString();
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    const user = {
      userId,
      email,
      name,
      bio: '',
      profilePicture: null,
      timezone: 'UTC',
      emailVerified,
      verificationToken: emailVerified ? null : uuidv4(),
      onboardingCompleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await dynamoDb.put(getTableName('users'), user);
    try { await sendAdminNewUserNotification(user); } catch (e) { /* noop */ }
    return user;
  }

  static async verifyEmail(token) {
    if (isOffline()) {
      // In offline mode, find user by verification token
      const users = await LocalStorage.listUsers();
      const user = users.find(u => u.verificationToken === token);
      if (!user) throw new Error('Invalid verification token');
      if (user.emailVerified) return user;
      const updated = { ...user, emailVerified: true, verificationToken: null, updatedAt: new Date().toISOString() };
      await LocalStorage.createUser(updated);
      return { ...updated, password: undefined };
    }

    // For DynamoDB, we need to scan since we don't have a GSI on verificationToken
    const params = {
      TableName: getTableName('users'),
      FilterExpression: 'verificationToken = :token',
      ExpressionAttributeValues: { ':token': token },
      Limit: 1,
    };
    const result = await dynamoDb.scan(params);
    const user = result.Items?.[0];
    if (!user) throw new Error('Invalid verification token');
    if (user.emailVerified) return user;

    // Update user to mark email as verified
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression({ 
        emailVerified: true, 
        verificationToken: null, 
        updatedAt: new Date().toISOString() 
      });
    const updateParams = {
      TableName: getTableName('users'),
      Key: { userId: user.userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const updateResult = await dynamoDb.update(updateParams);
    return updateResult.Attributes;
  }

  static async completeOnboarding(userId) {
    return this.update(userId, { onboardingCompleted: true });
  }
}

module.exports = User;
