const handler = require('../../../../src/handlers/swaptoys/delete').handler;

jest.mock('../../../../src/models/toyListing');
const mockToyListing = require('../../../../src/models/toyListing');

const mockEvent = (listingId, userId = 'user-123') => ({
  requestContext: {
    authorizer: {
      claims: { sub: userId },
    },
  },
  pathParameters: { listingId },
});

describe('Delete Toy Listing Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should delete listing and return 200', async () => {
    mockToyListing.delete = jest.fn().mockResolvedValue({ success: true });

    const result = await handler(mockEvent('listing-123'));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(mockToyListing.delete).toHaveBeenCalledWith('listing-123', 'user-123');
  });

  it('should return 401 when no userId', async () => {
    const event = {
      requestContext: { authorizer: { claims: {} } },
      pathParameters: { listingId: 'listing-123' },
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });

  it('should return 400 when listingId is missing', async () => {
    const event = {
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
      pathParameters: {},
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  it('should return 403 when not owner', async () => {
    mockToyListing.delete = jest.fn().mockRejectedValue(new Error('Not authorised'));

    const result = await handler(mockEvent('listing-123', 'other-user'));

    expect(result.statusCode).toBe(403);
  });

  it('should return 404 when listing does not exist', async () => {
    mockToyListing.delete = jest.fn().mockRejectedValue(new Error('Listing not found'));

    const result = await handler(mockEvent('bad-id'));

    expect(result.statusCode).toBe(404);
  });

  it('should return 500 on unexpected error', async () => {
    mockToyListing.delete = jest.fn().mockRejectedValue(new Error('DB error'));

    const result = await handler(mockEvent('listing-123'));

    expect(result.statusCode).toBe(500);
  });
});
