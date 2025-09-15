jest.mock('../../../../src/lib/notification-service', () => ({
  sendEmailIfEnabled: jest.fn().mockResolvedValue({ sent: true }),
}));
const { handler } = require('../../../../src/handlers/dm/sendMessage');
const DM = require('../../../../src/models/dm');
const User = require('../../../../src/models/user');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/dm');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/response');

describe('dm.sendMessage handler', () => {
  jest.setTimeout(15000);
  beforeEach(() => jest.clearAllMocks());

  it('sends message in existing conversation (idempotent ensure)', async () => {
    const currentUser = { userId: 'u1' };
    const conv = { conversationId: 'conv1', userAId: 'u1', userBId: 'u2' };
    const msg = { conversationId: 'conv1', messageId: 'm1', fromUserId: 'u1', toUserId: 'u2', content: 'hi' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DM.ensureConversation.mockResolvedValue(conv);
    DM.sendMessage.mockResolvedValue(msg);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify({}) });

    const res = await handler({
      headers: { Authorization: 'Bearer t' },
      pathParameters: { conversationId: 'conv1' },
      body: JSON.stringify({ toUserId: 'u2', content: 'hi' }),
    });

    expect(User.getCurrentUser).toHaveBeenCalledWith('t');
    expect(DM.ensureConversation).toHaveBeenCalledWith('u1', 'u2');
    expect(DM.sendMessage).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('rejects when conversationId mismatch', async () => {
    const currentUser = { userId: 'u1' };
    const conv = { conversationId: 'convX', userAId: 'u1', userBId: 'u2' };
    User.getCurrentUser.mockResolvedValue(currentUser);
    DM.ensureConversation.mockResolvedValue(conv);
    response.error.mockReturnValue({ statusCode: 403 });

    const res = await handler({
      headers: { Authorization: 'Bearer t' },
      pathParameters: { conversationId: 'conv1' },
      body: JSON.stringify({ toUserId: 'u2', content: 'hi' }),
    });

    expect(res.statusCode).toBe(403);
  });

  it('400 when missing content', async () => {
    User.getCurrentUser.mockResolvedValue({ userId: 'u1' });
    response.error.mockReturnValue({ statusCode: 400 });
    const res = await handler({ headers: { Authorization: 'Bearer t' }, pathParameters: { conversationId: 'c' }, body: JSON.stringify({ toUserId: 'u2' }) });
    expect(res.statusCode).toBe(400);
  });
});
