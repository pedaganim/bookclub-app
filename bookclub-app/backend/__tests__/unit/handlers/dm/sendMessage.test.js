const { handler } = require('../../../../src/handlers/dm/sendMessage');
const DMService = require('../../../../src/services/dm-service');
const User = require('../../../../src/models/user');

jest.mock('../../../../src/services/dm-service');
jest.mock('../../../../src/models/user');
jest.mock('../../../../src/lib/notification-service', () => ({
  sendEmailIfEnabled: jest.fn().mockResolvedValue({ sent: true }),
}));

describe('dm.sendMessage handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends message successfully', async () => {
    const currentUser = { userId: 'u1' };
    const msg = { conversationId: 'conv1', messageId: 'm1', fromUserId: 'u1', toUserId: 'u2', content: 'hi' };
    
    User.getCurrentUser.mockResolvedValue(currentUser);
    DMService.sendMessage.mockResolvedValue(msg);

    const event = {
      headers: { Authorization: 'Bearer test-token' },
      pathParameters: { conversationId: 'conv1' },
      body: JSON.stringify({ toUserId: 'u2', content: 'hi' }),
    };

    const res = await handler(event);

    expect(User.getCurrentUser).toHaveBeenCalledWith('test-token');
    expect(DMService.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv1',
      fromUserId: 'u1',
      toUserId: 'u2',
      content: 'hi',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(msg);
  });

  it('returns 403 when forbidden error occurs in service', async () => {
    User.getCurrentUser.mockResolvedValue({ userId: 'u1' });
    DMService.sendMessage.mockRejectedValue(new Error('FORBIDDEN:Not your conversation'));

    const event = {
      headers: { Authorization: 'Bearer t' },
      pathParameters: { conversationId: 'conv1' },
      body: JSON.stringify({ toUserId: 'u2', content: 'hi' }),
    };

    const res = await handler(event);

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Not your conversation');
  });

  it('returns 400 when missing content', async () => {
    User.getCurrentUser.mockResolvedValue({ userId: 'u1' });
    
    const event = {
      headers: { Authorization: 'Bearer t' },
      pathParameters: { conversationId: 'c' },
      body: JSON.stringify({ toUserId: 'u2' })
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(400);
  });
});
