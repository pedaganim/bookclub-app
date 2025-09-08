const fs = require('fs');
const path = require('path');
const LocalStorage = require('../../../src/lib/local-storage');

// Mock fs module
jest.mock('fs');
const mockedFs = fs;

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('LocalStorage', () => {
  const mockUsersData = {
    'test@example.com': {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Test bio',
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  };

  const mockBooksData = {
    'book-123': {
      bookId: 'book-123',
      title: 'Test Book',
      author: 'Test Author',
      userId: 'user-123',
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fs.existsSync to return true for storage directory creation
    mockedFs.existsSync.mockReturnValue(true);
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadUsers', () => {
    it('should load users from file when file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockUsersData));

      const result = LocalStorage.loadUsers();

      expect(result).toEqual(mockUsersData);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('users.json'),
        'utf8'
      );
    });

    it('should return empty object when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = LocalStorage.loadUsers();

      expect(result).toEqual({});
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should return empty object and log error when file read fails', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = LocalStorage.loadUsers();

      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        '[LocalStorage] Error loading users:',
        expect.any(Error)
      );
    });
  });

  describe('saveUsers', () => {
    it('should save users to file', () => {
      LocalStorage.saveUsers(mockUsersData);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('users.json'),
        JSON.stringify(mockUsersData, null, 2)
      );
    });

    it('should log error when file write fails', () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      LocalStorage.saveUsers(mockUsersData);

      expect(console.error).toHaveBeenCalledWith(
        '[LocalStorage] Error saving users:',
        expect.any(Error)
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = {
        userId: 'user-456',
        email: 'new@example.com',
        name: 'New User',
        bio: 'New bio'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await LocalStorage.createUser(newUser);

      expect(result).toEqual(newUser);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when email exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockUsersData));

      const result = await LocalStorage.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUsersData['test@example.com']);
    });

    it('should return null when email does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await LocalStorage.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createBook', () => {
    it('should create a new book', async () => {
      const newBook = {
        bookId: 'book-456',
        title: 'New Book',
        author: 'New Author',
        userId: 'user-123'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await LocalStorage.createBook(newBook);

      expect(result).toEqual(newBook);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('listBooks', () => {
    it('should return all books when no userId provided', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockBooksData));

      const result = await LocalStorage.listBooks();

      expect(result).toEqual(Object.values(mockBooksData));
    });

    it('should return filtered books when userId provided', async () => {
      const booksWithMultipleUsers = {
        'book-123': { ...mockBooksData['book-123'], userId: 'user-123' },
        'book-456': { bookId: 'book-456', title: 'Book 2', userId: 'user-456' }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(booksWithMultipleUsers));

      const result = await LocalStorage.listBooks('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });
  });
});