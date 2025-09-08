const request = require('supertest');
const app = require('../helpers/test-app');
const fs = require('fs');
const path = require('path');

// Mock the LocalStorage module to use test storage directory
const TEST_STORAGE_DIR = path.join(__dirname, '../../.test-storage');

// Mock the local storage paths
jest.mock('../../src/lib/local-storage', () => {
  const originalModule = jest.requireActual('../../src/lib/local-storage');
  const path = require('path');
  
  const TEST_STORAGE_DIR = path.join(__dirname, '../../.test-storage');
  const USERS_FILE = path.join(TEST_STORAGE_DIR, 'users.json');
  const BOOKS_FILE = path.join(TEST_STORAGE_DIR, 'books.json');
  
  // Create a modified LocalStorage that uses test directory
  class TestLocalStorage {
    static loadUsers() {
      try {
        if (require('fs').existsSync(USERS_FILE)) {
          const data = require('fs').readFileSync(USERS_FILE, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('[TestLocalStorage] Error loading users:', error);
      }
      return {};
    }

    static saveUsers(users) {
      try {
        require('fs').writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      } catch (error) {
        console.error('[TestLocalStorage] Error saving users:', error);
      }
    }

    static loadBooks() {
      try {
        if (require('fs').existsSync(BOOKS_FILE)) {
          const data = require('fs').readFileSync(BOOKS_FILE, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('[TestLocalStorage] Error loading books:', error);
      }
      return {};
    }

    static saveBooks(books) {
      try {
        require('fs').writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
      } catch (error) {
        console.error('[TestLocalStorage] Error saving books:', error);
      }
    }

    static async createUser(user) {
      const users = this.loadUsers();
      users[user.email] = user;
      this.saveUsers(users);
      return user;
    }

    static async getUserByEmail(email) {
      const users = this.loadUsers();
      return users[email] || null;
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

    static async authenticateUser(email, password) {
      const user = await this.getUserByEmail(email);
      if (user && user.password === password) {
        return {
          user: user,
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            idToken: 'mock-id-token'
          }
        };
      }
      return null;
    }
  }
  
  return TestLocalStorage;
});

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Set environment to offline mode
    process.env.IS_OFFLINE = 'true';
    
    // Clean up test storage
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        bio: 'I love reading books!'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: userData.email,
        name: userData.name
      });
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.password).toBeUndefined(); // Should not return password
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.errors).toMatchObject({
        email: 'Email is required',
        password: 'Password is required',
        name: 'Name is required'
      });
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // First registration should succeed
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.errors.email).toBe('A user with this email already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      await request(app)
        .post('/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: loginData.email,
        name: 'Test User'
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.errors).toMatchObject({
        email: 'Email is required',
        password: 'Password is required'
      });
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.message).toBe('User not found');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.message).toBe('Incorrect email or password');
    });
  });

  describe('Authentication Flow', () => {
    it('should allow complete register and login flow', async () => {
      const userData = {
        email: 'flow@example.com',
        password: 'password123',
        name: 'Flow User',
        bio: 'Testing the flow'
      };

      // Register
      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.data.email).toBe(userData.email);

      // Login with same credentials
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.data.user.email).toBe(userData.email);
      expect(loginResponse.body.data.user.userId).toBe(registerResponse.body.data.userId);
    });
  });
});