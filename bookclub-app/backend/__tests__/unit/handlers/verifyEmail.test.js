const { handler } = require('../../../src/handlers/users/verifyEmail');
const User = require('../../../src/models/user');

jest.mock('../../../src/models/user');

describe('verifyEmail handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify email with valid token', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    };

    User.verifyEmail.mockResolvedValue(mockUser);

    const event = {
      body: JSON.stringify({ token: 'valid-token-123' }),
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Email verified successfully');
    expect(body.data.user.emailVerified).toBe(true);
    expect(User.verifyEmail).toHaveBeenCalledWith('valid-token-123');
  });

  it('should return error if token is missing', async () => {
    const event = {
      body: JSON.stringify({}),
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Verification token is required');
  });

  it('should return error if token is invalid', async () => {
    User.verifyEmail.mockRejectedValue(new Error('Invalid verification token'));

    const event = {
      body: JSON.stringify({ token: 'invalid-token' }),
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Invalid verification token');
  });

  it('should handle missing body gracefully', async () => {
    const event = {};

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });
});
