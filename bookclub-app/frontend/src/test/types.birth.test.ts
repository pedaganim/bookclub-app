import { User } from '../types';

describe('User Type - Birth Feature Tests', () => {
  it('should accept User with dateOfBirth', () => {
    const user: User = {
      userId: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Test bio',
      profilePicture: 'https://example.com/pic.jpg',
      dateOfBirth: '1990-05-15',
      createdAt: '2023-01-01T00:00:00.000Z',
    };

    expect(user.dateOfBirth).toBe('1990-05-15');
    expect(typeof user.dateOfBirth).toBe('string');
  });

  it('should accept User without dateOfBirth (optional field)', () => {
    const user: User = {
      userId: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: '2023-01-01T00:00:00.000Z',
    };

    expect(user.dateOfBirth).toBeUndefined();
  });

  it('should accept User with undefined dateOfBirth', () => {
    const user: User = {
      userId: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      dateOfBirth: undefined,
      createdAt: '2023-01-01T00:00:00.000Z',
    };

    expect(user.dateOfBirth).toBeUndefined();
  });

  it('should validate User interface structure with all fields', () => {
    const user: User = {
      userId: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Bio text',
      profilePicture: 'pic.jpg',
      dateOfBirth: '1985-12-25',
      createdAt: '2023-01-01T00:00:00.000Z',
    };

    // Verify all required fields are present
    expect(user.userId).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.createdAt).toBeDefined();
    
    // Verify optional fields
    expect(user.bio).toBeDefined();
    expect(user.profilePicture).toBeDefined();
    expect(user.dateOfBirth).toBeDefined();
    
    // Verify types
    expect(typeof user.userId).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.bio).toBe('string');
    expect(typeof user.profilePicture).toBe('string');
    expect(typeof user.dateOfBirth).toBe('string');
    expect(typeof user.createdAt).toBe('string');
  });

  it('should handle ISO date string format for dateOfBirth', () => {
    const isoDate = '1990-05-15';
    const user: User = {
      userId: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      dateOfBirth: isoDate,
      createdAt: '2023-01-01T00:00:00.000Z',
    };

    expect(user.dateOfBirth).toBe(isoDate);
    
    // Verify it's a valid date format
    const date = new Date(user.dateOfBirth!);
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(1990);
    expect(date.getMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(date.getDate()).toBe(15);
  });
});