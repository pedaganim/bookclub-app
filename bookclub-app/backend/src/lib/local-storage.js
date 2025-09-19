const fs = require('fs');
const path = require('path');

// Only enable local file storage when running offline (local dev / serverless-offline).
const OFFLINE = process.env.IS_OFFLINE === 'true'
  || process.env.NODE_ENV === 'development'
  || process.env.SERVERLESS_OFFLINE === 'true';

// Use a simple file-based storage for serverless offline
const STORAGE_DIR = path.join(__dirname, '../../.local-storage');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const BOOKS_FILE = path.join(STORAGE_DIR, 'books.json');
const CLUBS_FILE = path.join(STORAGE_DIR, 'clubs.json');
const CLUB_MEMBERS_FILE = path.join(STORAGE_DIR, 'club-members.json');

if (OFFLINE) {
  // Ensure storage directory exists (local only)
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
} else {
  // In AWS Lambda, avoid any filesystem attempts during module load
  console.log('[LocalStorage] Running in cloud mode; local storage disabled');
}

class LocalStorage {
  static loadUsers() {
    if (!OFFLINE) return {};
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
    if (!OFFLINE) return;
    try {
      console.log('[LocalStorage] saveUsers path:', USERS_FILE);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving users:', error);
    }
  }

  static loadBooks() {
    if (!OFFLINE) return {};
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
    if (!OFFLINE) return;
    try {
      console.log('[LocalStorage] saveBooks path:', BOOKS_FILE);
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving books:', error);
    }
  }

  static loadClubs() {
    if (!OFFLINE) return {};
    try {
      const exists = fs.existsSync(CLUBS_FILE);
      if (exists) {
        const data = fs.readFileSync(CLUBS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading clubs:', error);
    }
    return {};
  }

  static saveClubs(clubs) {
    if (!OFFLINE) return;
    try {
      fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubs, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving clubs:', error);
    }
  }

  static loadClubMembers() {
    if (!OFFLINE) return {};
    try {
      const exists = fs.existsSync(CLUB_MEMBERS_FILE);
      if (exists) {
        const data = fs.readFileSync(CLUB_MEMBERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading club members:', error);
    }
    return {};
  }

  static saveClubMembers(members) {
    if (!OFFLINE) return;
    try {
      fs.writeFileSync(CLUB_MEMBERS_FILE, JSON.stringify(members, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving club members:', error);
    }
  }

  // User operations
  static async createUser(user) {
    if (!OFFLINE) return user;
    console.log('Creating user:', user.email);
    const users = this.loadUsers();
    users[user.email] = user;
    this.saveUsers(users);
    console.log('Total users:', Object.keys(users).length);
    return user;
  }

  static async getUserByEmail(email) {
    if (!OFFLINE) return null;
    console.log('Looking for user:', email);
    const users = this.loadUsers();
    console.log('Available users:', Object.keys(users));
    const user = users[email];
    console.log('User found:', user ? 'Yes' : 'No');
    return user || null;
  }

  static async getUserById(userId) {
    if (!OFFLINE) return null;
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
    if (!OFFLINE) return book;
    const books = this.loadBooks();
    books[book.bookId] = book;
    this.saveBooks(books);
    return book;
  }

  static async getBook(bookId) {
    if (!OFFLINE) return null;
    const books = this.loadBooks();
    return books[bookId] || null;
  }

  static async listBooks(userId = null) {
    if (!OFFLINE) return [];
    const books = this.loadBooks();
    const allBooks = Object.values(books);
    if (userId) {
      return allBooks.filter(book => book.userId === userId);
    }
    return allBooks;
  }

  static async updateBook(bookId, updates) {
    if (!OFFLINE) return null;
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
    if (!OFFLINE) return false;
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
    if (!OFFLINE) return null;
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
    if (!OFFLINE) return null;
    if (token.startsWith('local-token-')) {
      const userId = token.replace('local-token-', '');
      return this.getUserById(userId);
    }
    return null;
  }

  // Club operations
  static async createClub(club) {
    if (!OFFLINE) return club;
    const clubs = this.loadClubs();
    clubs[club.clubId] = club;
    this.saveClubs(clubs);
    return club;
  }

  static async getClubById(clubId) {
    if (!OFFLINE) return null;
    const clubs = this.loadClubs();
    return clubs[clubId] || null;
  }

  static async getClubByInviteCode(inviteCode) {
    if (!OFFLINE) return null;
    const clubs = this.loadClubs();
    for (const club of Object.values(clubs)) {
      if (club.inviteCode === inviteCode) {
        return club;
      }
    }
    return null;
  }

  static async deleteClub(clubId) {
    if (!OFFLINE) return false;
    const clubs = this.loadClubs();
    if (clubs[clubId]) {
      delete clubs[clubId];
      this.saveClubs(clubs);
      return true;
    }
    return false;
  }

  // Club member operations
  static async createClubMember(membership) {
    if (!OFFLINE) return membership;
    const members = this.loadClubMembers();
    const key = `${membership.clubId}:${membership.userId}`;
    members[key] = membership;
    this.saveClubMembers(members);
    return membership;
  }

  static async getClubMember(clubId, userId) {
    if (!OFFLINE) return null;
    const members = this.loadClubMembers();
    const key = `${clubId}:${userId}`;
    return members[key] || null;
  }

  static async deleteClubMember(clubId, userId) {
    if (!OFFLINE) return false;
    const members = this.loadClubMembers();
    const key = `${clubId}:${userId}`;
    if (members[key]) {
      delete members[key];
      this.saveClubMembers(members);
      return true;
    }
    return false;
  }

  static async getClubMembers(clubId) {
    if (!OFFLINE) return [];
    const members = this.loadClubMembers();
    return Object.values(members).filter(member => member.clubId === clubId);
  }

  static async getUserClubs(userId) {
    if (!OFFLINE) return [];
    const members = this.loadClubMembers();
    return Object.values(members).filter(member => member.userId === userId);
  }

  static async isClubMember(clubId, userId) {
    if (!OFFLINE) return false;
    const member = await this.getClubMember(clubId, userId);
    return member !== null;
  }

  static async deleteAllClubMembers(clubId) {
    if (!OFFLINE) return;
    const members = this.loadClubMembers();
    const filtered = {};
    for (const [key, member] of Object.entries(members)) {
      if (member.clubId !== clubId) {
        filtered[key] = member;
      }
    }
    this.saveClubMembers(filtered);
  }
}

module.exports = LocalStorage;
