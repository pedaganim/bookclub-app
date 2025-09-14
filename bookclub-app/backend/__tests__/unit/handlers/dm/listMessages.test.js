const { handler } = require('../../../../src/handlers/dm/listMessages');
const DM = require('../../../../src/models/dm');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/dm');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/response');

describe('dm.listMessages handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists messages for a conversation with pagination', async () => {
    const currentUser = { userId: 'u1' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DM.listMessages.mockResolvedValue({ items: [{ messageId: 'm1' }], nextToken: { k: 'v' } });
    response.success.mockImplementation((data) => ({ statusCode: 200, body: JSON.stringify(data) }));

    const res = await handler({ headers: { Authorization: 'Bearer t' }, pathParameters: { conversationId: 'c1' }, queryStringParameters: { limit: '5' } });

    expect(User.getCurrentUser).toHaveBeenCalledWith('t');
    expect(DM.listMessages).toHaveBeenCalledWith('c1', 5, undefined);
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    response.error.mockReturnValue({ statusCode: 401 });
    const res = await handler({ headers: {}, pathParameters: { conversationId: 'c1' } });
    expect(res.statusCode).toBe(401);
  });
});
