const fs = require('fs');
const path = require('path');

// Use a simple file-based storage for serverless offline
const STORAGE_DIR = path.join(__dirname, '../../.local-storage');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const BOOKS_FILE = path.join(STORAGE_DIR, 'books.json');
const NOTIFICATIONS_FILE = path.join(STORAGE_DIR, 'notifications.json');
const CLUBS_FILE = path.join(STORAGE_DIR, 'clubs.json');
const MEETINGS_FILE = path.join(STORAGE_DIR, 'meetings.json');
const VOTES_FILE = path.join(STORAGE_DIR, 'votes.json');

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

  // Club operations
  static loadClubs() {
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
    try {
      fs.writeFileSync(CLUBS_FILE, JSON.stringify(clubs, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving clubs:', error);
    }
  }

  static async createClub(club) {
    console.log('Creating club:', club.name);
    const clubs = this.loadClubs();
    clubs[club.clubId] = club;
    this.saveClubs(clubs);
    console.log('Total clubs:', Object.keys(clubs).length);
    return club;
  }

  static async getClub(clubId) {
    const clubs = this.loadClubs();
    return clubs[clubId] || null;
  }

  static async addClubMember(clubId, userId) {
    const clubs = this.loadClubs();
    const club = clubs[clubId];
    if (!club) return null;
    
    if (!club.members.includes(userId)) {
      club.members.push(userId);
      club.updatedAt = new Date().toISOString();
      clubs[clubId] = club;
      this.saveClubs(clubs);
    }
    return club;
  }

  // Meeting operations
  static loadMeetings() {
    try {
      const exists = fs.existsSync(MEETINGS_FILE);
      if (exists) {
        const data = fs.readFileSync(MEETINGS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading meetings:', error);
    }
    return {};
  }

  static saveMeetings(meetings) {
    try {
      fs.writeFileSync(MEETINGS_FILE, JSON.stringify(meetings, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving meetings:', error);
    }
  }

  static async createMeeting(meeting) {
    console.log('Creating meeting:', meeting.title);
    const meetings = this.loadMeetings();
    meetings[meeting.meetingId] = meeting;
    this.saveMeetings(meetings);
    console.log('Total meetings:', Object.keys(meetings).length);
    return meeting;
  }

  static async getMeeting(meetingId) {
    const meetings = this.loadMeetings();
    return meetings[meetingId] || null;
  }

  // Vote operations
  static loadVotes() {
    try {
      const exists = fs.existsSync(VOTES_FILE);
      if (exists) {
        const data = fs.readFileSync(VOTES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[LocalStorage] Error loading votes:', error);
    }
    return {};
  }

  static saveVotes(votes) {
    try {
      fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2));
    } catch (error) {
      console.error('[LocalStorage] Error saving votes:', error);
    }
  }

  static async createVote(vote) {
    console.log('Creating vote for book:', vote.bookTitle);
    const votes = this.loadVotes();
    votes[vote.voteId] = vote;
    this.saveVotes(votes);
    console.log('Total votes:', Object.keys(votes).length);
    return vote;
  }

  // Discussion operations
  static async createDiscussionReply(reply) {
    console.log('Creating discussion reply');
    // For simplicity, we'll just store replies in memory for this demo
    // In a real app, these would be in a proper discussion storage
    if (!this.discussionReplies) {
      this.discussionReplies = {};
    }
    this.discussionReplies[reply.replyId] = reply;
    console.log('Total discussion replies:', Object.keys(this.discussionReplies).length);
    return reply;
  }
}

module.exports = LocalStorage;
