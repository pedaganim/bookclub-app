const handler = require('../../handlers/books/enrichGoogleMetadata');

jest.mock('../../models/book', () => ({
  getById: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../lib/book-metadata', () => ({
  searchBookMetadata: jest.fn(),
}));

const Book = require('../../models/book');
const bookMetadataService = require('../../lib/book-metadata');

describe('enrichGoogleMetadata handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when bookId missing', async () => {
    const res = await handler.handler({ detail: {} });
    expect(res.statusCode).toBe(400);
  });

  it('no-op when book not found', async () => {
    Book.getById.mockResolvedValue(null);
    const res = await handler.handler({ detail: { bookId: 'x' } });
    expect(res.statusCode).toBe(404);
  });

  it('stores google_metadata when metadata found', async () => {
    Book.getById.mockResolvedValue({ bookId: 'b1', userId: 'u1', title: 'T', author: 'A' });
    bookMetadataService.searchBookMetadata.mockResolvedValue({ title: 'T', authors: ['A'], source: 'google-books' });
    Book.update.mockResolvedValue({});

    const res = await handler.handler({ detail: { bookId: 'b1' } });
    expect(res.statusCode).toBe(200);
    expect(Book.update).toHaveBeenCalledWith('b1', 'u1', expect.objectContaining({ google_metadata: expect.any(Object) }));
  });

  it('returns enriched:false when no metadata', async () => {
    Book.getById.mockResolvedValue({ bookId: 'b2', userId: 'u2' });
    bookMetadataService.searchBookMetadata.mockResolvedValue(null);

    const res = await handler.handler({ detail: { bookId: 'b2' } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.enriched).toBe(false);
  });
});
