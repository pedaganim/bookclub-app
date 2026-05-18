const { handler } = require('../../../../src/handlers/dm/listConversations');
const DMService = require('../../../../src/services/dm-service');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/services/dm-service');
jest.mock('../../../../src/models/user');

describe('dm.listConversations handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists conversations for current user', async () => {
    const currentUser = { userId: 'u1' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DMService.listConversations.mockResolvedValue({ items: [{ conversationId: 'c1' }] });

    const res = await handler({ headers: { Authorization: 'Bearer t' }, queryStringParameters: { limit: '10' } });

    expect(User.getCurrentUser).toHaveBeenCalledWith('t');
    expect(DMService.listConversations).toHaveBeenCalledWith('u1', 10);
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await handler({ headers: {} });
    expect(res.statusCode).toBe(401);
  });
});
