const handler = require('../../../../src/handlers/users/updateProfile');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

// Mock the User model
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/local-storage');

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
    body: JSON.stringify(body),
    headers: {}
  });

  describe('timezone validation', () => {
    it('should reject invalid timezone', async () => {
      const event = mockEvent({
        timezone: 'Invalid/Timezone'
      });

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.errors.timezone).toBe('Invalid timezone');
    });

    it('should accept UTC timezone', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        timezone: 'UTC',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      User.update.mockResolvedValue(mockUser);

      const event = mockEvent({
        timezone: 'UTC'
      });

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(200);
      expect(User.update).toHaveBeenCalledWith('test-user-id', { timezone: 'UTC' });
      const body = JSON.parse(result.body);
      expect(body.data.timezone).toBe('UTC');
    });

    it('should accept IANA timezone identifiers', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        timezone: 'America/New_York',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      User.update.mockResolvedValue(mockUser);

      const event = mockEvent({
        timezone: 'America/New_York'
      });

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(200);
      expect(User.update).toHaveBeenCalledWith('test-user-id', { timezone: 'America/New_York' });
      const body = JSON.parse(result.body);
      expect(body.data.timezone).toBe('America/New_York');
    });

    it('should accept all frontend timezone options', async () => {
      const frontendTimezones = [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney'
      ];

      for (const timezone of frontendTimezones) {
        const mockUser = {
          userId: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          timezone: timezone,
          createdAt: '2023-01-01T00:00:00.000Z'
        };

        User.update.mockResolvedValue(mockUser);

        const event = mockEvent({ timezone });
        const result = await handler.handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.data.timezone).toBe(timezone);
      }
    });
  });

  describe('other profile updates', () => {
    it('should update name successfully', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Updated Name',
        bio: 'Test bio',
        timezone: 'UTC',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      User.update.mockResolvedValue(mockUser);

      const event = mockEvent({
        name: 'Updated Name'
      });

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(200);
      expect(User.update).toHaveBeenCalledWith('test-user-id', { name: 'Updated Name' });
    });

    it('should reject empty updates', async () => {
      const event = mockEvent({});

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.errors.message).toBe('No valid fields to update');
    });

    it('should filter out invalid fields', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Updated bio',
        timezone: 'UTC',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      User.update.mockResolvedValue(mockUser);

      const event = mockEvent({
        bio: 'Updated bio',
        invalidField: 'should be ignored',
        email: 'should be ignored'
      });

      const result = await handler.handler(event);

      expect(result.statusCode).toBe(200);
      expect(User.update).toHaveBeenCalledWith('test-user-id', { bio: 'Updated bio' });
    });
  });
});