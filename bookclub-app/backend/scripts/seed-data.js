const LocalStorage = require('../src/lib/local-storage');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Seed script to populate local development environment with test data
 * This creates sample users and books for testing
 */

/**
 * Simple password hashing for development seed data
 * Using SHA-256 with salt for better security than plain text
 * Note: In production, use bcrypt or similar proper password hashing libraries
 */
function hashPassword(password) {
  const salt = 'dev-seed-salt'; // Fixed salt for consistent development data (generic, not year-specific)
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const SAMPLE_USERS = [
  {
    userId: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    password: 'password123', // Plain password for development
    createdAt: new Date().toISOString()
  },
  {
    userId: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    password: 'password123', // Plain password for development
    createdAt: new Date().toISOString()
  },
  {
    userId: 'user-3',
    email: 'carol@example.com',
    name: 'Carol Davis',
    password: 'password123', // Plain password for development
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_BOOKS = [
  {
    bookId: uuidv4(),
    userId: 'user-1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    description: 'A classic American novel set in the Jazz Age.',
    genre: 'Classic Literature',
    condition: 'Good',
    availability: 'available',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-1',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0-06-112008-4',
    description: 'A gripping tale of racial injustice and childhood innocence.',
    genre: 'Classic Literature',
    condition: 'Excellent',
    availability: 'available',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-2',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '978-0-316-76948-0',
    description: 'A coming-of-age story in New York City.',
    genre: 'Classic Literature',
    condition: 'Fair',
    availability: 'available',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-2',
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0-441-17271-9',
    description: 'Epic science fiction novel set on the desert planet Arrakis.',
    genre: 'Science Fiction',
    condition: 'Good',
    availability: 'borrowed',
    borrowedBy: 'user-3',
    borrowedAt: new Date().toISOString(),
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-3',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    isbn: '978-0-547-92822-7',
    description: 'A fantasy adventure about Bilbo Baggins\' unexpected journey.',
    genre: 'Fantasy',
    condition: 'Excellent',
    availability: 'available',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-3',
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '978-0-7352-1129-2',
    description: 'An easy & proven way to build good habits & break bad ones.',
    genre: 'Self-Help',
    condition: 'Like New',
    availability: 'available',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function seedData() {
  console.log('🌱 Seeding development data...');
  
  try {
    // Seed users
    console.log('Creating sample users...');
    for (const user of SAMPLE_USERS) {
      await LocalStorage.createUser(user);
      console.log(`  ✓ Created user: ${user.name} (${user.email})`);
    }
    
    // Seed books
    console.log('Creating sample books...');
    for (const book of SAMPLE_BOOKS) {
      await LocalStorage.createBook(book);
      console.log(`  ✓ Created book: "${book.title}" by ${book.author}`);
    }
    
    console.log('\n🎉 Sample data seeded successfully!');
    console.log('\nSample users for testing:');
    SAMPLE_USERS.forEach(user => {
      console.log(`  • ${user.email} (password: password123)`);
    });
    
    console.log('\nSample books created:');
    SAMPLE_BOOKS.forEach(book => {
      console.log(`  • "${book.title}" by ${book.author} - Owner: ${book.userId}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData, SAMPLE_USERS, SAMPLE_BOOKS };