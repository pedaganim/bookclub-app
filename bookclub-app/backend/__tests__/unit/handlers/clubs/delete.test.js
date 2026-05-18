const { handler } = require('../../../../src/handlers/clubs/delete');
const ClubService = require('../../../../src/services/club-service');
const BookClub = require('../../../../src/models/bookclub');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/services/club-service');
jest.mock('../../../../src/models/bookclub');
jest.mock('../../../../src/models/user');

describe('clubs.delete handler', () => {
  beforeEach(() => jest.clearAllMocks());

  const authHeader = { Authorization: 'Bearer token123' };
  const currentUser = { userId: 'user-1', role: 'user' };

  it('deletes club when requester is creator', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    User.getById.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue({ clubId: 'c1', createdBy: 'user-1' });
    ClubService.delete.mockResolvedValue(true);

    const res = await handler({ pathParameters: { clubId: 'c1' }, headers: authHeader });

    expect(User.getCurrentUser).toHaveBeenCalledWith('token123');
    expect(BookClub.getById).toHaveBeenCalledWith('c1');
    expect(ClubService.delete).toHaveBeenCalledWith('c1');
    expect(res.statusCode).toBe(200);
  });

  it('returns 403 if requester is not creator', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    User.getById.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue({ clubId: 'c1', createdBy: 'user-2' });

    const res = await handler({ pathParameters: { clubId: 'c1' }, headers: authHeader });

    expect(res.statusCode).toBe(403);
    expect(ClubService.delete).not.toHaveBeenCalled();
  });

  it('returns 404 if club not found', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    User.getById.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue(null);

    const res = await handler({ pathParameters: { clubId: 'cX' }, headers: authHeader });

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 when no token', async () => {
    const res = await handler({ pathParameters: { clubId: 'c1' }, headers: {} });
    expect(res.statusCode).toBe(401);
  });
});
