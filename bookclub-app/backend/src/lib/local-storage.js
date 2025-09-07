const fs = require('fs');
const path = require('path');

// Use a simple file-based storage for serverless offline
const STORAGE_DIR = path.join(__dirname, '../../.local-storage');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const BOOKS_FILE = path.join(STORAGE_DIR, 'books.json');
const NOTIFICATIONS_FILE = path.join(STORAGE_DIR, 'notifications.json');

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

class LocalStorage {
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

  static saveUsers(users) {
    try {
      console.log('[LocalStorage] saveUsers path:', USERS_FILE);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving users:', error);
    }
  }

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

  static saveBooks(books) {
    try {
      console.log('[LocalStorage] saveBooks path:', BOOKS_FILE);
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving books:', error);
    }
  }

  // User operations
  static async createUser(user) {
    console.log('Creating user:', user.email);
    const users = this.loadUsers();
    users[user.email] = user;
    this.saveUsers(users);
    console.log('Total users:', Object.keys(users).length);
    return user;
  }

  static async getUserByEmail(email) {
    console.log('Looking for user:', email);
    const users = this.loadUsers();
    console.log('Available users:', Object.keys(users));
    const user = users[email];
    console.log('User found:', user ? 'Yes' : 'No');
    return user || null;
  }

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

  // Notification operations
  static loadNotifications() {
    try {
      const exists = fs.existsSync(NOTIFICATIONS_FILE);
      if (exists) {
        const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading notifications:', error);
    }
    return {};
  }

  static saveNotifications(notifications) {
    try {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving notifications:', error);
    }
  }

  static async createNotification(notification) {
    console.log('Creating notification:', notification.notificationId);
    const notifications = this.loadNotifications();
    notifications[notification.notificationId] = notification;
    this.saveNotifications(notifications);
    console.log('Total notifications:', Object.keys(notifications).length);
    return notification;
  }

  static async getNotification(notificationId) {
    const notifications = this.loadNotifications();
    return notifications[notificationId] || null;
  }

  static async listNotificationsByUser(userId, limit = 20, nextToken = null) {
    const notifications = this.loadNotifications();
    const userNotifications = Object.values(notifications)
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = nextToken ? parseInt(nextToken, 10) : 0;
    const endIndex = startIndex + limit;
    const items = userNotifications.slice(startIndex, endIndex);
    
    return {
      items,
      nextToken: endIndex < userNotifications.length ? endIndex.toString() : null,
    };
  }

  static async updateNotification(notificationId, updates) {
    const notifications = this.loadNotifications();
    const existing = notifications[notificationId];
    if (!existing) return null;
    
    const updated = { ...existing, ...updates };
    notifications[notificationId] = updated;
    this.saveNotifications(notifications);
    return updated;
  }

  static async getUnreadNotificationCount(userId) {
    const notifications = this.loadNotifications();
    return Object.values(notifications)
      .filter(n => n.userId === userId && !n.read)
      .length;
  }
}

module.exports = LocalStorage;
