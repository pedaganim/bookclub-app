const { handler } = require('../../../src/handlers/users/completeOnboarding');
const User = require('../../../src/models/user');

jest.mock('../../../src/models/user');

describe('completeOnboarding handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete onboarding for authenticated user', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockUpdatedUser = {
      ...mockUser,
      onboardingCompleted: true,
    };

    User.getCurrentUser.mockResolvedValue(mockUser);
    User.completeOnboarding.mockResolvedValue(mockUpdatedUser);

    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Onboarding completed');
    expect(body.data.user.onboardingCompleted).toBe(true);
    expect(User.getCurrentUser).toHaveBeenCalledWith('valid-token');
    expect(User.completeOnboarding).toHaveBeenCalledWith('user-123');
  });

  it('should return 401 if authorization token is missing', async () => {
    const event = {
      headers: {},
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Missing authorization token');
  });

  it('should return 404 if user not found', async () => {
    User.getCurrentUser.mockResolvedValue(null);

    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('User not found');
  });
});
