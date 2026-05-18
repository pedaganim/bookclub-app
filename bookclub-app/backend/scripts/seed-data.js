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

const SAMPLE_CLUBS = [
  {
    clubId: 'club-fiction-001',
    name: 'Fiction Lovers',
    slug: 'fiction-lovers',
    description: 'A club for people who love reading fiction.',
    location: 'New York, NY',
    createdBy: 'user-1',
    inviteCode: 'FICT1234',
    isPrivate: false,
    memberLimit: 50,
    memberCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    clubId: 'club-scifi-002',
    name: 'Sci-Fi Enthusiasts',
    slug: 'sci-fi-enthusiasts',
    description: 'Exploring the universe through science fiction.',
    location: 'San Francisco, CA',
    createdBy: 'user-2',
    inviteCode: 'SCFI1234',
    isPrivate: false,
    memberLimit: 20,
    memberCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const SAMPLE_MEMBERSHIPS = [
  { clubId: 'club-fiction-001', userId: 'user-1', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
  { clubId: 'club-fiction-001', userId: 'user-2', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  { clubId: 'club-fiction-001', userId: 'user-3', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  { clubId: 'club-scifi-002', userId: 'user-2', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
  { clubId: 'club-scifi-002', userId: 'user-3', role: 'member', status: 'active', joinedAt: new Date().toISOString() },
  
  // Explicitly add 'local-user' to clubs so the default local login can see the gated items
  { clubId: 'club-fiction-001', userId: 'local-user', role: 'admin', status: 'active', joinedAt: new Date().toISOString() },
  { clubId: 'club-scifi-002', userId: 'local-user', role: 'member', status: 'active', joinedAt: new Date().toISOString() }
];

const SAMPLE_BOOKS = [
  {
    bookId: uuidv4(),
    userId: 'user-1',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    category: 'book',
    clubId: null, // Global item
    description: 'A classic book on software craftsmanship.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'local-user',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    category: 'book',
    clubId: 'club-fiction-001',
    description: 'A classic American novel set in the Jazz Age.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'local-user',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    category: 'book',
    clubId: 'club-fiction-001',
    description: 'A gripping tale of racial injustice.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-2',
    title: 'Dune',

    author: 'Frank Herbert',
    category: 'book',
    clubId: 'club-scifi-002',
    description: 'Epic science fiction novel.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-2',
    title: 'LEGO Star Wars X-Wing',
    category: 'toy',
    clubId: 'club-scifi-002',
    description: 'Building set for Star Wars fans.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-3',
    title: 'Cordless Power Drill',
    category: 'tool',
    clubId: 'club-fiction-001',
    description: 'High performance 18V drill.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-2',
    title: 'Settlers of Catan',
    category: 'game',
    clubId: 'club-scifi-002',
    description: 'The classic board game.',
    status: 'available',
    createdAt: new Date().toISOString()
  },
  {
    bookId: uuidv4(),
    userId: 'user-1',
    title: 'Professional Tripod',
    category: 'other',
    clubId: 'club-fiction-001',
    description: 'Sturdy aluminum tripod.',
    status: 'available',
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_LOST_FOUND_ITEMS = [
  {
    lostFoundId: uuidv4(),
    reporterId: 'user-3',
    title: 'Found Keys at Park',
    type: 'found',
    clubId: 'club-fiction-001',
    description: 'Found a set of keys near the swing set.',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    lostFoundId: uuidv4(),
    reporterId: 'user-1',
    title: 'Lost Golden Retriever',
    type: 'lost',
    clubId: 'club-fiction-001',
    description: 'Missing dog answers to Buddy. Has a blue collar.',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

async function seedData() {
  console.log('🌱 Seeding development data...');
  
  try {
    // Seed users
    console.log('Creating sample users...');
    for (const user of SAMPLE_USERS) {
      await LocalStorage.createUser(user);
    }
    
    // Seed clubs
    console.log('Creating sample clubs...');
    for (const club of SAMPLE_CLUBS) {
      await LocalStorage.createClub(club);
    }
    
    // Seed memberships
    console.log('Creating sample memberships...');
    for (const membership of SAMPLE_MEMBERSHIPS) {
      await LocalStorage.createClubMember(membership);
    }
    
    // Seed items
    console.log('Creating sample items...');
    for (const book of SAMPLE_BOOKS) {
      await LocalStorage.createBook(book);
    }
    
    // Seed lost and found
    console.log('Creating sample lost & found items...');
    for (const item of SAMPLE_LOST_FOUND_ITEMS) {
      await LocalStorage.createLostFoundItem(item);
    }
    
    console.log('\n🎉 Sample data seeded successfully!');
    console.log('Available items: Books, Toys, Tools, Games, Other');
    console.log('Available lost & found: Keys, Dog');
    console.log('Available clubs: Fiction Lovers, Sci-Fi Enthusiasts');
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