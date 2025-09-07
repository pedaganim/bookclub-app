const { handler } = require('../handlers/users/register');

describe('Register Handler - Birth Feature Integration Tests', () => {
  beforeEach(() => {
    // Clear storage before each test
    const LocalStorage = require('../lib/local-storage');
    jest.clearAllMocks();
    
    // Mock LocalStorage methods
    LocalStorage.getUserByEmail = jest.fn();
    LocalStorage.createUser = jest.fn().mockResolvedValue();
  });

  it('should register user with dateOfBirth successfully', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue(null); // User doesn't exist
    
    const event = {
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        bio: 'Test bio',
        dateOfBirth: '1990-05-15',
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.email).toBe('john@example.com');
    expect(responseBody.data.name).toBe('John Doe');

    // Verify LocalStorage.createUser was called with correct data including dateOfBirth
    expect(LocalStorage.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'john@example.com',
        name: 'John Doe',
        bio: 'Test bio',
        dateOfBirth: '1990-05-15',
        userId: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  it('should register user without dateOfBirth (optional field)', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue(null);
    
    const event = {
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        bio: 'Test bio',
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(true);

    // Verify dateOfBirth is set to null when not provided
    expect(LocalStorage.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: null,
      })
    );
  });

  it('should register user with empty dateOfBirth', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue(null);
    
    const event = {
      body: JSON.stringify({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'password123',
        bio: 'Test bio',
        dateOfBirth: '',
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(true);

    // Verify empty string dateOfBirth is converted to null
    expect(LocalStorage.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: null,
      })
    );
  });

  it('should still validate required fields when dateOfBirth is provided', async () => {
    const event = {
      body: JSON.stringify({
        dateOfBirth: '1990-05-15',
        // Missing required fields: name, email, password
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error.errors).toHaveProperty('email');
    expect(responseBody.error.errors).toHaveProperty('name');
    expect(responseBody.error.errors).toHaveProperty('password');
  });

  it('should handle various dateOfBirth formats', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue(null);
    
    const testCases = [
      '1990-01-01',
      '2000-12-31',
      '1985-06-15',
      '1975-11-20',
    ];

    for (const dateOfBirth of testCases) {
      jest.clearAllMocks();
      
      const event = {
        body: JSON.stringify({
          name: 'Test User',
          email: `test-${dateOfBirth}@example.com`,
          password: 'password123',
          dateOfBirth,
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(LocalStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          dateOfBirth,
        })
      );
    }
  });

  it('should handle existing user validation regardless of dateOfBirth', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue({
      userId: 'existing-user',
      email: 'existing@example.com',
    });
    
    const event = {
      body: JSON.stringify({
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
        dateOfBirth: '1990-05-15',
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error.errors.email).toContain('already exists');
    
    // Verify createUser was not called
    expect(LocalStorage.createUser).not.toHaveBeenCalled();
  });

  it('should handle malformed JSON with dateOfBirth', async () => {
    const event = {
      body: '{ invalid json with dateOfBirth }',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(false);
  });

  it('should preserve all user data including dateOfBirth in response', async () => {
    const LocalStorage = require('../lib/local-storage');
    LocalStorage.getUserByEmail.mockResolvedValue(null);
    
    const userData = {
      name: 'Complete User',
      email: 'complete@example.com',
      password: 'password123',
      bio: 'Complete bio',
      dateOfBirth: '1988-09-22',
    };

    const event = {
      body: JSON.stringify(userData),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    
    // Response should include user data (but not password or dateOfBirth for security)
    expect(responseBody.data).toEqual({
      userId: expect.any(String),
      email: userData.email,
      name: userData.name,
    });
    
    // But the stored user should have all data including dateOfBirth
    expect(LocalStorage.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: userData.name,
        email: userData.email,
        bio: userData.bio,
        dateOfBirth: userData.dateOfBirth,
        password: userData.password, // Stored but not returned
      })
    );
  });
});