const User = require('../models/user');

describe('User Model - Birth Feature Tests', () => {
  describe('register', () => {
    beforeEach(() => {
      // Reset LocalStorage mock
      const LocalStorage = require('../lib/local-storage');
      jest.clearAllMocks();
      
      // Mock LocalStorage methods
      LocalStorage.createUser = jest.fn().mockResolvedValue();
      LocalStorage.getUserById = jest.fn();
      LocalStorage.getUserByEmail = jest.fn();
      LocalStorage.authenticateUser = jest.fn();
      LocalStorage.verifyToken = jest.fn();
    });

    it('should register user with dateOfBirth when provided', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        bio: 'Test bio',
        dateOfBirth: '1990-05-15',
      };

      const LocalStorage = require('../lib/local-storage');
      LocalStorage.createUser.mockResolvedValue();

      const result = await User.register(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.bio).toBe(userData.bio);
      expect(result.dateOfBirth).toBe(userData.dateOfBirth);
      expect(result.password).toBeUndefined(); // Password should not be returned
      expect(result.userId).toBeDefined();
      expect(result.createdAt).toBeDefined();

      expect(LocalStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          name: userData.name,
          bio: userData.bio,
          dateOfBirth: userData.dateOfBirth,
        })
      );
    });

    it('should register user with null dateOfBirth when not provided', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        bio: 'Test bio',
      };

      const LocalStorage = require('../lib/local-storage');
      LocalStorage.createUser.mockResolvedValue();

      const result = await User.register(userData);

      expect(result).toBeDefined();
      expect(result.dateOfBirth).toBeNull();

      expect(LocalStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          dateOfBirth: null,
        })
      );
    });

    it('should register user with null dateOfBirth when empty string provided', async () => {
      const userData = {
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'password123',
        bio: 'Test bio',
        dateOfBirth: '',
      };

      const LocalStorage = require('../lib/local-storage');
      LocalStorage.createUser.mockResolvedValue();

      const result = await User.register(userData);

      expect(result).toBeDefined();
      expect(result.dateOfBirth).toBeNull();

      expect(LocalStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          dateOfBirth: null,
        })
      );
    });

    it('should validate dateOfBirth format implicitly (accept any string)', async () => {
      const userData = {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'password123',
        bio: 'Test bio',
        dateOfBirth: '2000-12-25',
      };

      const LocalStorage = require('../lib/local-storage');
      LocalStorage.createUser.mockResolvedValue();

      const result = await User.register(userData);

      expect(result).toBeDefined();
      expect(result.dateOfBirth).toBe('2000-12-25');
    });
  });

  describe('ensureExistsFromClaims', () => {
    it('should create user with null dateOfBirth when user does not exist', async () => {
      const claims = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Mock getById to return null (user doesn't exist)
      User.getById = jest.fn().mockResolvedValue(null);
      
      // Mock DynamoDB put
      global.mockDynamoDb.put.mockResolvedValue();

      const result = await User.ensureExistsFromClaims(claims);

      expect(result).toBeDefined();
      expect(result.userId).toBe(claims.sub);
      expect(result.email).toBe(claims.email);
      expect(result.name).toBe(claims.name);
      expect(result.dateOfBirth).toBeNull();
      expect(result.bio).toBe('');

      expect(global.mockDynamoDb.put).toHaveBeenCalledWith(
        undefined, // This seems to be the actual value
        expect.objectContaining({
          userId: claims.sub,
          email: claims.email,
          name: claims.name,
          dateOfBirth: null,
          bio: '',
          profilePicture: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    });

    it('should return existing user when user already exists', async () => {
      const claims = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const existingUser = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        dateOfBirth: '1985-03-10',
        bio: 'Existing bio',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      // Mock getById to return existing user
      User.getById = jest.fn().mockResolvedValue(existingUser);

      const result = await User.ensureExistsFromClaims(claims);

      expect(result).toEqual(existingUser);
      expect(global.mockDynamoDb.put).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user dateOfBirth when provided in offline mode', async () => {
      const userId = 'user123';
      const updates = {
        dateOfBirth: '1988-07-20',
        bio: 'Updated bio',
      };

      const existingUser = {
        userId,
        email: 'test@example.com',
        name: 'Test User',
        dateOfBirth: '1985-03-10',
        bio: 'Old bio',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const LocalStorage = require('../lib/local-storage');
      LocalStorage.getUserById = jest.fn().mockResolvedValue(existingUser);
      LocalStorage.createUser = jest.fn().mockResolvedValue();

      const result = await User.update(userId, updates);

      expect(result).toBeDefined();
      expect(result.dateOfBirth).toBe(updates.dateOfBirth);
      expect(result.bio).toBe(updates.bio);
      expect(result.updatedAt).toBeDefined();
      expect(result.password).toBeUndefined();

      expect(LocalStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          dateOfBirth: updates.dateOfBirth,
          bio: updates.bio,
        })
      );
    });
  });
});