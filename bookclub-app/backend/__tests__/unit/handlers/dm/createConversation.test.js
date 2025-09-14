const { handler } = require('../../../../src/handlers/dm/createConversation');
const DM = require('../../../../src/models/dm');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/dm');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/response');

describe('dm.createConversation handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates conversation for valid token and toUserId', async () => {
    const currentUser = { userId: 'u1' };
    const conv = { conversationId: 'abc', userAId: 'u1', userBId: 'u2' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DM.ensureConversation.mockResolvedValue(conv);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify({}) });

    const res = await handler({ headers: { Authorization: 'Bearer token' }, body: JSON.stringify({ toUserId: 'u2' }) });

    expect(User.getCurrentUser).toHaveBeenCalledWith('token');
    expect(DM.ensureConversation).toHaveBeenCalledWith('u1', 'u2');
    expect(response.success).toHaveBeenCalledWith(conv);
    expect(res.statusCode).toBe(200);
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
