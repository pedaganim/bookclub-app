const { handler } = require('../../../../src/handlers/clubs/update');
const BookClub = require('../../../../src/models/bookclub');
const User = require('../../../../src/models/user');
const ClubService = require('../../../../src/services/club-service');

jest.mock('../../../../src/models/bookclub');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/services/club-service');

describe('clubs.update handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authHeader = { Authorization: 'Bearer token123' };
  const mockUser = { userId: 'user-1', role: 'user' };
  const mockClub = { clubId: 'c1', createdBy: 'user-1', name: 'Old' };

  it('updates club when requester is creator', async () => {
    User.getCurrentUser.mockResolvedValue(mockUser);
    User.getById.mockResolvedValue(mockUser);
    BookClub.getById.mockResolvedValue(mockClub);
    BookClub.getMemberRole.mockResolvedValue('member'); // creator or admin
    
    const updatedClub = { ...mockClub, name: 'New' };
    ClubService.update.mockResolvedValue(updatedClub);

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(User.getCurrentUser).toHaveBeenCalledWith('token123');
    expect(BookClub.getById).toHaveBeenCalledWith('c1');
    expect(ClubService.update).toHaveBeenCalledWith('c1', { name: 'New' }, 'user-1');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual(updatedClub);
  });

  it('returns 403 if requester is not admin or owner', async () => {
    User.getCurrentUser.mockResolvedValue(mockUser);
    User.getById.mockResolvedValue(mockUser);
    BookClub.getById.mockResolvedValue({ clubId: 'c1', createdBy: 'user-2' });
    BookClub.getMemberRole.mockResolvedValue('member');

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 if club not found', async () => {
    User.getCurrentUser.mockResolvedValue(mockUser);
    User.getById.mockResolvedValue(mockUser);
    BookClub.getById.mockResolvedValue(null);

    const res = await handler({
      pathParameters: { clubId: 'missing' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 on invalid input', async () => {
    User.getCurrentUser.mockResolvedValue(mockUser);
    User.getById.mockResolvedValue(mockUser);
    BookClub.getById.mockResolvedValue(mockClub);
    BookClub.getMemberRole.mockResolvedValue('admin');

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: '' }), // Too short
    });

    expect(res.statusCode).toBe(400);
  });
});
