const handler = require('../../handlers/books/cleanDescription');

jest.mock('../../models/book', () => ({
  getById: jest.fn(),
  update: jest.fn(),
}));

const Book = require('../../models/book');

describe('cleanDescription handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when bookId missing', async () => {
    const res = await handler.handler({ detail: {} });
    expect(res.statusCode).toBe(400);
  });

  it('cleans and updates clean_description from textractExtractedText', async () => {
    Book.getById.mockResolvedValue({ bookId: 'b1', userId: 'u1', textractExtractedText: 'Hello\n\tWorld' });
    Book.update.mockResolvedValue({});

    const res = await handler.handler({ detail: { bookId: 'b1' } });
    expect(res.statusCode).toBe(200);
    expect(Book.update).toHaveBeenCalledWith('b1', 'u1', expect.objectContaining({ clean_description: 'Hello World' }));
  });

  it('falls back to description when textractExtractedText missing', async () => {
    Book.getById.mockResolvedValue({ bookId: 'b2', userId: 'u2', description: '  Some    text  ' });
    Book.update.mockResolvedValue({});

    const res = await handler.handler({ detail: { bookId: 'b2' } });
    expect(res.statusCode).toBe(200);
    expect(Book.update).toHaveBeenCalledWith('b2', 'u2', expect.objectContaining({ clean_description: 'Some text' }));
  });
});
