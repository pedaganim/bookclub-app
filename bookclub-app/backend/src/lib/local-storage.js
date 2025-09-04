/**
 * Local file-based storage utility for development and testing
 * Provides persistent storage using JSON files as a DynamoDB alternative
 */
const fs = require('fs');
const path = require('path');

// Use a simple file-based storage for serverless offline
const STORAGE_DIR = path.join(__dirname, '../../.local-storage');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const BOOKS_FILE = path.join(STORAGE_DIR, 'books.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('[LocalStorage] Created storage dir:', STORAGE_DIR);
  } catch (e) {
    console.error('[LocalStorage] Failed to create storage dir:', STORAGE_DIR, e);
  }
} else {
  console.log('[LocalStorage] Using storage dir:', STORAGE_DIR);
}

/**
 * Local storage class providing file-based database operations for development
 */
class LocalStorage {
  /**
   * Loads users from the local JSON file
   * @returns {Object} Object containing user data keyed by email
   */
  static loadUsers() {
    try {
      const exists = fs.existsSync(USERS_FILE);
      console.log('[LocalStorage] loadUsers path:', USERS_FILE, 'exists:', exists);
      if (exists) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading users:', error);
    }
    return {};
  }

  /**
   * Saves users data to the local JSON file
   * @param {Object} users - Object containing user data keyed by email
   */
  static saveUsers(users) {
    try {
      console.log('[LocalStorage] saveUsers path:', USERS_FILE);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving users:', error);
    }
  }

  /**
   * Loads books from the local JSON file
   * @returns {Object} Object containing book data keyed by bookId
   */
  static loadBooks() {
    try {
      const exists = fs.existsSync(BOOKS_FILE);
      console.log('[LocalStorage] loadBooks path:', BOOKS_FILE, 'exists:', exists);
      if (exists) {
        const data = fs.readFileSync(BOOKS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading books:', error);
    }
    return {};
  }

  /**
   * Saves books data to the local JSON file
   * @param {Object} books - Object containing book data keyed by bookId
   */
  static saveBooks(books) {
    try {
      console.log('[LocalStorage] saveBooks path:', BOOKS_FILE);
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving books:', error);
    }
  }

  // User operations
  /**
   * Creates a new user in local storage
   * @param {Object} user - User object to store
   * @param {string} user.email - User's email address (used as key)
   * @param {string} user.userId - Unique user identifier
   * @param {string} user.name - User's display name
   * @param {string} user.password - User's password
   * @returns {Promise<Object>} The created user object
   */
  static async createUser(user) {
    console.log('Creating user:', user.email);
    const users = this.loadUsers();
    users[user.email] = user;
    this.saveUsers(users);
    console.log('Total users:', Object.keys(users).length);
    return user;
  }

  /**
   * Retrieves a user by email address
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object if found, null otherwise
   */
  static async getUserByEmail(email) {
    console.log('Looking for user:', email);
    const users = this.loadUsers();
    console.log('Available users:', Object.keys(users));
    const user = users[email];
    console.log('User found:', user ? 'Yes' : 'No');
    return user || null;
  }

  /**
   * Retrieves a user by their unique identifier
   * @param {string} userId - Unique user identifier
   * @returns {Promise<Object|null>} User object if found, null otherwise
   */
  static async getUserById(userId) {
    const users = this.loadUsers();
    for (const user of Object.values(users)) {
      if (user.userId === userId) {
        return user;
      }
    }
    return null;
  }

  // Book operations
  static async createBook(book) {
    const books = this.loadBooks();
    books[book.bookId] = book;
    this.saveBooks(books);
    return book;
  }

  static async getBook(bookId) {
    const books = this.loadBooks();
    return books[bookId] || null;
  }

  static async listBooks(userId = null) {
    const books = this.loadBooks();
    const allBooks = Object.values(books);
    if (userId) {
      return allBooks.filter(book => book.userId === userId);
    }
    return allBooks;
  }

  static async updateBook(bookId, updates) {
    const books = this.loadBooks();
    const book = books[bookId];
    if (book) {
      const updatedBook = { ...book, ...updates, updatedAt: new Date().toISOString() };
      books[bookId] = updatedBook;
      this.saveBooks(books);
      return updatedBook;
    }
    return null;
  }

  static async deleteBook(bookId) {
    const books = this.loadBooks();
    if (books[bookId]) {
      delete books[bookId];
      this.saveBooks(books);
      return true;
    }
    return false;
  }

  // Simple authentication
  static async authenticateUser(email, password) {
    console.log('Authenticating user:', email);
    const users = this.loadUsers();
    const user = users[email];
    console.log('User exists:', user ? 'Yes' : 'No');
    if (user) {
      console.log('Password match:', user.password === password);
    }
    
    if (user && user.password === password) {
      return {
        user: { ...user, password: undefined },
        tokens: {
          accessToken: `local-token-${user.userId}`,
          refreshToken: `local-refresh-${user.userId}`,
          idToken: `local-id-${user.userId}`,
          expiresIn: 3600,
        },
      };
    }
    return null;
  }

  static async verifyToken(token) {
    if (token.startsWith('local-token-')) {
      const userId = token.replace('local-token-', '');
      return this.getUserById(userId);
    }
    return null;
  }
}

module.exports = LocalStorage;
