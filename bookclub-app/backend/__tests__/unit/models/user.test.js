const User = require('../../../src/models/user');

// Mock dependencies
jest.mock('../../../src/lib/local-storage');
jest.mock('../../../src/lib/dynamodb');
jest.mock('../../../src/lib/table-names', () => ({
  getTableName: jest.fn((key) => `bookclub-app-${key}-test`)
}));
jest.mock('../../../src/lib/aws-config');

const LocalStorage = require('../../../src/lib/local-storage');
const dynamoDb = require('../../../src/lib/dynamodb');
const { getTableName } = require('../../../src/lib/table-names');

// Mock environment variables
const originalEnv = process.env;

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('isOffline mode', () => {
    beforeEach(() => {
      process.env.IS_OFFLINE = 'true';
    });

    describe('getById', () => {
      it('should use LocalStorage when offline', async () => {
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        LocalStorage.getUserById.mockResolvedValue(mockUser);

        const result = await User.getById('user-123');

        expect(LocalStorage.getUserById).toHaveBeenCalledWith('user-123');
        expect(result).toEqual(mockUser);
        expect(dynamoDb.get).not.toHaveBeenCalled();
      });
    });

    describe('getByEmail', () => {
      it('should use LocalStorage when offline', async () => {
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        LocalStorage.getUserByEmail.mockResolvedValue(mockUser);

        const result = await User.getByEmail('test@example.com');

        expect(LocalStorage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(result).toEqual(mockUser);
        expect(dynamoDb.query).not.toHaveBeenCalled();
      });

      it('should return null when user not found', async () => {
        LocalStorage.getUserByEmail.mockResolvedValue(null);

        const result = await User.getByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });
    });

    describe('login', () => {
      it('should authenticate user successfully in offline mode', async () => {
        const mockAuthResult = {
          user: {
            userId: 'user-123',
            email: 'test@example.com',
            name: 'Test User'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        };

        LocalStorage.authenticateUser.mockResolvedValue(mockAuthResult);

        const result = await User.login('test@example.com', 'password123');

        expect(LocalStorage.authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(result).toEqual({
          ...mockAuthResult.user,
          tokens: mockAuthResult.tokens
        });
      });

      it('should throw error when authentication fails', async () => {
        LocalStorage.authenticateUser.mockResolvedValue(null);

        await expect(User.login('test@example.com', 'wrongpassword'))
          .rejects
          .toThrow('Incorrect email or password');
      });
    });

    describe('update', () => {
      it('should update user in offline mode', async () => {
        const existingUser = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          bio: 'Old bio',
          createdAt: '2023-01-01T00:00:00.000Z'
        };

        const updates = {
          name: 'Updated User',
          bio: 'New bio'
        };

        LocalStorage.getUserById.mockResolvedValue(existingUser);
        LocalStorage.createUser.mockResolvedValue(true);

        const result = await User.update('user-123', updates);

        expect(LocalStorage.getUserById).toHaveBeenCalledWith('user-123');
        expect(LocalStorage.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            ...existingUser,
            ...updates,
            updatedAt: expect.any(String)
          })
        );
        expect(result.password).toBeUndefined();
        expect(result.name).toBe('Updated User');
        expect(result.bio).toBe('New bio');
      });

      it('should return null when user not found', async () => {
        LocalStorage.getUserById.mockResolvedValue(null);

        const result = await User.update('nonexistent-user', { name: 'New Name' });

        expect(result).toBeNull();
      });
    });
  });

  describe('online mode (DynamoDB)', () => {
    beforeEach(() => {
      process.env.IS_OFFLINE = 'false';
      process.env.NODE_ENV = 'production';
    });

    describe('getById', () => {
      it('should use DynamoDB when online', async () => {
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        dynamoDb.get.mockResolvedValue(mockUser);

        const result = await User.getById('user-123');

        expect(dynamoDb.get).toHaveBeenCalledWith(
          'bookclub-app-users-test',
          { userId: 'user-123' }
        );
        expect(result).toEqual(mockUser);
        expect(LocalStorage.getUserById).not.toHaveBeenCalled();
      });
    });

    describe('getByEmail', () => {
      it('should use DynamoDB query when online', async () => {
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        dynamoDb.query.mockResolvedValue([mockUser]);

        const result = await User.getByEmail('test@example.com');

        expect(dynamoDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: { ':email': 'test@example.com' }
          })
        );
        expect(result).toEqual(mockUser);
      });

      it('should return null when no user found in DynamoDB', async () => {
        dynamoDb.query.mockResolvedValue([]);

        const result = await User.getByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });
    });
  });

  describe('ensureExistsFromClaims', () => {
    beforeEach(() => {
      process.env.IS_OFFLINE = 'false';
    });

    it('should return existing user if found', async () => {
      const claims = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const existingUser = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      dynamoDb.get.mockResolvedValue(existingUser);

      const result = await User.ensureExistsFromClaims(claims);

      expect(result).toEqual(existingUser);
      expect(dynamoDb.put).not.toHaveBeenCalled();
    });

    it('should create user from claims if not found', async () => {
      const claims = {
        sub: 'user-456',
        email: 'new@example.com',
        name: 'New User'
      };

      dynamoDb.get.mockResolvedValue(null);
      dynamoDb.put.mockResolvedValue();

      const result = await User.ensureExistsFromClaims(claims);

      expect(dynamoDb.get).toHaveBeenCalledWith(
        'bookclub-app-users-test',
        { userId: 'user-456' }
      );
      expect(dynamoDb.put).toHaveBeenCalledWith(
        'bookclub-app-users-test',
        expect.objectContaining({
          userId: 'user-456',
          email: 'new@example.com',
          name: 'New User',
          bio: '',
          profilePicture: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );
      expect(result.userId).toBe('user-456');
    });

    it('should handle missing claims gracefully', async () => {
      const result = await User.ensureExistsFromClaims(null);
      expect(result).toBeNull();

      const result2 = await User.ensureExistsFromClaims({});
      expect(result2).toBeNull();
    });

    it('should derive name from email when name not provided', async () => {
      const claims = {
        sub: 'user-789',
        email: 'example@domain.com'
      };

      dynamoDb.get.mockResolvedValue(null);
      dynamoDb.put.mockResolvedValue();

      await User.ensureExistsFromClaims(claims);

      expect(dynamoDb.put).toHaveBeenCalledWith(
        'bookclub-app-users-test',
        expect.objectContaining({
          name: 'example'
        })
      );
    });
  });
});