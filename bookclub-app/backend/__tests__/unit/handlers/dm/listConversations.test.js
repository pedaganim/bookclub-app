const { handler } = require('../../../../src/handlers/dm/listConversations');
const DM = require('../../../../src/models/dm');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/dm');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/response');

describe('dm.listConversations handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists conversations for current user', async () => {
    const currentUser = { userId: 'u1' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DM.listConversationsForUser.mockResolvedValue({ items: [{ conversationId: 'c1' }] });
    response.success.mockReturnValue({ statusCode: 200 });

    const res = await handler({ headers: { Authorization: 'Bearer t' }, queryStringParameters: { limit: '10' } });

    expect(User.getCurrentUser).toHaveBeenCalledWith('t');
    expect(DM.listConversationsForUser).toHaveBeenCalledWith('u1', 10);
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    response.error.mockReturnValue({ statusCode: 401 });
    const res = await handler({ headers: {} });
    expect(res.statusCode).toBe(401);
  });
});
