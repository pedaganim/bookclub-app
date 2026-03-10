const handler = require('../../../../src/handlers/swaptoys/create').handler;

jest.mock('../../../../src/models/toyListing');
const mockToyListing = require('../../../../src/models/toyListing');

const mockEvent = (body, userId = 'user-123') => ({
  requestContext: {
    authorizer: {
      claims: { sub: userId },
    },
  },
  body: JSON.stringify(body),
});

describe('Create Toy Listing Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a listing and return 201', async () => {
    const mockListing = {
      listingId: 'abc-123',
      userId: 'user-123',
      title: 'Wooden Train Set',
      condition: 'good',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockToyListing.create = jest.fn().mockResolvedValue(mockListing);

    const result = await handler(mockEvent({ title: 'Wooden Train Set', condition: 'good' }));

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Wooden Train Set');
    expect(mockToyListing.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Wooden Train Set', condition: 'good' }),
      'user-123'
    );
  });

  it('should return 400 when title is missing', async () => {
    const result = await handler(mockEvent({ condition: 'good' }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.title).toBeDefined();
  });

  it('should return 400 when condition is invalid', async () => {
    const result = await handler(mockEvent({ title: 'Train Set', condition: 'terrible' }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.condition).toBeDefined();
  });

  it('should return 400 when category is invalid', async () => {
    const result = await handler(mockEvent({ title: 'Train Set', condition: 'good', category: 'not-a-category' }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.category).toBeDefined();
  });

  it('should return 401 when no userId in token', async () => {
    const event = {
      requestContext: { authorizer: { claims: {} } },
      body: JSON.stringify({ title: 'Train Set', condition: 'good' }),
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });

  it('should return 500 on unexpected error', async () => {
    mockToyListing.create = jest.fn().mockRejectedValue(new Error('DB error'));

    const result = await handler(mockEvent({ title: 'Train Set', condition: 'good' }));

    expect(result.statusCode).toBe(500);
  });
});
