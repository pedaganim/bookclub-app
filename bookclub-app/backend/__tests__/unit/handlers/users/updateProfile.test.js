const { handler } = require('../../../../src/handlers/users/updateProfile');
const UserService = require('../../../../src/services/user-service');

// Mock the UserService
jest.mock('../../../../src/services/user-service');

describe('updateProfile handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvent = (body, userId = 'test-user-id') => ({
    requestContext: {
      authorizer: {
        claims: {
          sub: userId
        }
      }
    },
    userId,
    body: JSON.stringify(body),
    headers: {}
  });

  describe('timezone validation', () => {
    it('should reject invalid timezone', async () => {
      const event = mockEvent({
        timezone: 'Invalid/Timezone'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.errors.timezone).toBe('Invalid timezone');
    });

    it('should accept UTC timezone', async () => {
      const mockUser = {
        userId: 'test-user-id',
        timezone: 'UTC',
      };

      UserService.updateProfile.mockResolvedValue(mockUser);

      const event = mockEvent({
        timezone: 'UTC'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(UserService.updateProfile).toHaveBeenCalledWith('test-user-id', { timezone: 'UTC' });
      const body = JSON.parse(result.body);
      expect(body.data.timezone).toBe('UTC');
    });
  });

  describe('other profile updates', () => {
    it('should update name successfully', async () => {
      const mockUser = {
        userId: 'test-user-id',
        name: 'Updated Name',
      };

      UserService.updateProfile.mockResolvedValue(mockUser);

      const event = mockEvent({
        name: 'Updated Name'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(UserService.updateProfile).toHaveBeenCalledWith('test-user-id', { name: 'Updated Name' });
    });

    it('should reject empty updates', async () => {
      const event = mockEvent({});

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.errors.message).toBe('No valid fields to update');
    });

    it('should filter out invalid fields', async () => {
      const mockUser = {
        userId: 'test-user-id',
        bio: 'Updated bio',
      };

      UserService.updateProfile.mockResolvedValue(mockUser);

      const event = mockEvent({
        bio: 'Updated bio',
        invalidField: 'should be ignored',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(UserService.updateProfile).toHaveBeenCalledWith('test-user-id', { bio: 'Updated bio' });
    });
  });
});