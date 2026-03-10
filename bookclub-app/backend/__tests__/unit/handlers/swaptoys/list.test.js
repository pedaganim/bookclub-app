const handler = require('../../../../src/handlers/swaptoys/list').handler;

jest.mock('../../../../src/models/toyListing');
const mockToyListing = require('../../../../src/models/toyListing');

describe('List Toy Listings Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockListings = [
    { listingId: 'abc-1', title: 'Train Set', condition: 'good' },
    { listingId: 'abc-2', title: 'Lego Set', condition: 'like_new' },
  ];

  it('should list all listings without filters', async () => {
    mockToyListing.listAll = jest.fn().mockResolvedValue({ items: mockListings, nextToken: null });

    const result = await handler({ queryStringParameters: null });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(mockToyListing.listAll).toHaveBeenCalled();
    expect(mockToyListing.listByUser).not.toHaveBeenCalled();
  });

  it('should list by userId when userId query param is provided', async () => {
    mockToyListing.listByUser = jest.fn().mockResolvedValue({ items: [mockListings[0]], nextToken: null });

    const result = await handler({ queryStringParameters: { userId: 'user-123' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.items).toHaveLength(1);
    expect(mockToyListing.listByUser).toHaveBeenCalledWith('user-123', 20, null);
  });

  it('should respect the limit param', async () => {
    mockToyListing.listAll = jest.fn().mockResolvedValue({ items: [mockListings[0]], nextToken: 'token123' });

    const result = await handler({ queryStringParameters: { limit: '1' } });

    expect(result.statusCode).toBe(200);
    expect(mockToyListing.listAll).toHaveBeenCalledWith(1, null);
  });

  it('should cap limit at 100', async () => {
    mockToyListing.listAll = jest.fn().mockResolvedValue({ items: mockListings, nextToken: null });

    await handler({ queryStringParameters: { limit: '999' } });

    expect(mockToyListing.listAll).toHaveBeenCalledWith(100, null);
  });

  it('should return 500 when model throws', async () => {
    mockToyListing.listAll = jest.fn().mockRejectedValue(new Error('DB fail'));

    const result = await handler({ queryStringParameters: null });

    expect(result.statusCode).toBe(500);
  });
});
