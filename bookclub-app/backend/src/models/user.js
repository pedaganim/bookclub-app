const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');
const AWS = require('aws-sdk');

// Initialize Cognito
const cognito = new AWS.CognitoIdentityServiceProvider();

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class User {
  static async register(userData) {
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    if (isOffline()) {
      const user = {
        userId,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || null,
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
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await dynamoDb.put(getTableName('users'), user);
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
}

module.exports = User;
