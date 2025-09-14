const { handler } = require('../../../../src/handlers/clubs/update');
const BookClub = require('../../../../src/models/bookclub');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/bookclub');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/response');

describe('clubs.update handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authHeader = { Authorization: 'Bearer token123' };
  const currentUser = { userId: 'user-1' };

  it('updates club when requester is creator', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue({ clubId: 'c1', createdBy: 'user-1', name: 'Old' });
    BookClub.update.mockResolvedValue({ clubId: 'c1', createdBy: 'user-1', name: 'New' });
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify({}) });

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(User.getCurrentUser).toHaveBeenCalledWith('token123');
    expect(BookClub.getById).toHaveBeenCalledWith('c1');
    expect(BookClub.update).toHaveBeenCalledWith('c1', { name: 'New' });
    expect(response.success).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('returns 403 if requester is not creator', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue({ clubId: 'c1', createdBy: 'user-2' });
    response.error.mockReturnValue({ statusCode: 403, body: JSON.stringify({}) });

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 if club not found', async () => {
    User.getCurrentUser.mockResolvedValue(currentUser);
    BookClub.getById.mockResolvedValue(null);
    response.error.mockReturnValue({ statusCode: 404, body: JSON.stringify({}) });

    const res = await handler({
      pathParameters: { clubId: 'missing' },
      headers: authHeader,
      body: JSON.stringify({ name: 'New' }),
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 on invalid name', async () => {
    response.error.mockReturnValue({ statusCode: 400, body: JSON.stringify({}) });

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: authHeader,
      body: JSON.stringify({ name: '' }),
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when no token', async () => {
    response.error.mockReturnValue({ statusCode: 401, body: JSON.stringify({}) });

    const res = await handler({
      pathParameters: { clubId: 'c1' },
      headers: {},
      body: JSON.stringify({ name: 'x' }),
    });

    expect(res.statusCode).toBe(401);
  });
});
