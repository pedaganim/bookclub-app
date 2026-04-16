const { handler } = require('../../../../src/handlers/dm/createConversation');
const DM = require('../../../../src/models/dm');
const User = require('../../../../src/models/user');
const BookClub = require('../../../../src/models/bookclub');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/dm');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/models/bookclub');
jest.mock('../../../../src/lib/response');

describe('dm.createConversation handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates conversation for valid token and shared club', async () => {
    const currentUser = { userId: 'u1' };
    const conv = { conversationId: 'abc', userAId: 'u1', userBId: 'u2' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    BookClub.getSharedClubIds.mockResolvedValue(['club1']);
    DM.ensureConversation.mockResolvedValue(conv);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify({}) });

    const res = await handler({ headers: { Authorization: 'Bearer token' }, body: JSON.stringify({ toUserId: 'u2' }) });

    expect(User.getCurrentUser).toHaveBeenCalledWith('token');
    expect(BookClub.getSharedClubIds).toHaveBeenCalledWith('u1', 'u2');
    expect(DM.ensureConversation).toHaveBeenCalledWith('u1', 'u2');
    expect(response.success).toHaveBeenCalledWith(conv);
    expect(res.statusCode).toBe(200);
  });

  it('returns 403 when no shared club found', async () => {
    User.getCurrentUser.mockResolvedValue({ userId: 'u1' });
    BookClub.getSharedClubIds.mockResolvedValue([]);
    response.error.mockReturnValue({ statusCode: 403 });

    const res = await handler({ headers: { Authorization: 'Bearer t' }, body: JSON.stringify({ toUserId: 'u2' }) });
    
    expect(BookClub.getSharedClubIds).toHaveBeenCalledWith('u1', 'u2');
    expect(DM.ensureConversation).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when missing toUserId', async () => {
    User.getCurrentUser.mockResolvedValue({ userId: 'u1' });
    response.error.mockReturnValue({ statusCode: 400 });

    const res = await handler({ headers: { Authorization: 'Bearer t' }, body: JSON.stringify({}) });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when no token', async () => {
    response.error.mockReturnValue({ statusCode: 401 });
    const res = await handler({ headers: {}, body: JSON.stringify({ toUserId: 'u2' }) });
    expect(res.statusCode).toBe(401);
  });
});
