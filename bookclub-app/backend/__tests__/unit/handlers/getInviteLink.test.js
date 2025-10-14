const { handler } = require('../../../src/handlers/clubs/getInviteLink');
const User = require('../../../src/models/user');
const BookClub = require('../../../src/models/bookclub');

jest.mock('../../../src/models/user');
jest.mock('../../../src/models/bookclub');

describe('getInviteLink handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://example.com';
  });

  it('should generate invite link for club member', async () => {
    const mockUser = {
      userId: 'user-123',
    };

    const mockClub = {
      clubId: 'club-456',
      name: 'Test Club',
      inviteCode: 'ABC12345',
    };

    User.getCurrentUser.mockResolvedValue(mockUser);
    BookClub.isMember.mockResolvedValue(true);
    BookClub.getById.mockResolvedValue(mockClub);

    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
      pathParameters: {
        clubId: 'club-456',
      },
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.inviteCode).toBe('ABC12345');
    expect(body.data.inviteUrl).toBe('https://example.com/invite/ABC12345');
  });

  it('should return 403 if user is not a member', async () => {
    const mockUser = {
      userId: 'user-123',
    };

    User.getCurrentUser.mockResolvedValue(mockUser);
    BookClub.isMember.mockResolvedValue(false);

    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
      pathParameters: {
        clubId: 'club-456',
      },
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('You must be a member of this club to generate invite links');
  });

  it('should return 404 if club not found', async () => {
    const mockUser = {
      userId: 'user-123',
    };

    User.getCurrentUser.mockResolvedValue(mockUser);
    BookClub.isMember.mockResolvedValue(true);
    BookClub.getById.mockResolvedValue(null);

    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
      pathParameters: {
        clubId: 'club-456',
      },
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Club not found');
  });
});
