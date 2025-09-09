const BookClub = require('../../../src/models/bookclub');
const LocalStorage = require('../../../src/lib/local-storage');

// Mock the environment for testing
process.env.IS_OFFLINE = 'true';
process.env.NODE_ENV = 'development';

describe('BookClub Model', () => {
  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  beforeEach(() => {
    // Clean up local storage before each test
    jest.clearAllMocks();
    // Clear the local storage files
    const path = require('path');
    const fs = require('fs');
    const storageDir = path.join(__dirname, '../../../.local-storage');
    const clubsFile = path.join(storageDir, 'clubs.json');
    const membersFile = path.join(storageDir, 'club-members.json');
    
    try {
      if (fs.existsSync(clubsFile)) fs.unlinkSync(clubsFile);
      if (fs.existsSync(membersFile)) fs.unlinkSync(membersFile);
    } catch (e) {
      // Ignore errors
    }
  });

  describe('create', () => {
    test('should create a new club with valid data', async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club for reading books',
        isPrivate: false,
        memberLimit: 10,
      };

      const club = await BookClub.create(clubData, testUserId);

      expect(club).toMatchObject({
        name: 'Test Book Club',
        description: 'A test club for reading books',
        createdBy: testUserId,
        isPrivate: false,
        memberLimit: 10,
      });
      expect(club.clubId).toBeDefined();
      expect(club.inviteCode).toBeDefined();
      expect(club.inviteCode).toHaveLength(8);
      expect(club.createdAt).toBeDefined();
      expect(club.updatedAt).toBeDefined();
    });

    test('should automatically add creator as admin member', async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club',
      };

      const club = await BookClub.create(clubData, testUserId);
      const isMember = await BookClub.isMember(club.clubId, testUserId);
      const role = await BookClub.getMemberRole(club.clubId, testUserId);

      expect(isMember).toBe(true);
      expect(role).toBe('admin');
    });
  });

  describe('getByInviteCode', () => {
    test('should find club by invite code', async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club',
      };

      const club = await BookClub.create(clubData, testUserId);
      const foundClub = await BookClub.getByInviteCode(club.inviteCode);

      expect(foundClub).toMatchObject({
        clubId: club.clubId,
        name: 'Test Book Club',
        inviteCode: club.inviteCode,
      });
    });

    test('should return null for invalid invite code', async () => {
      const foundClub = await BookClub.getByInviteCode('INVALID123');
      expect(foundClub).toBeNull();
    });
  });

  describe('membership operations', () => {
    let testClub;

    beforeEach(async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club',
      };
      testClub = await BookClub.create(clubData, testUserId);
    });

    test('should add member to club', async () => {
      await BookClub.addMember(testClub.clubId, testUserId2, 'member');
      
      const isMember = await BookClub.isMember(testClub.clubId, testUserId2);
      const role = await BookClub.getMemberRole(testClub.clubId, testUserId2);

      expect(isMember).toBe(true);
      expect(role).toBe('member');
    });

    test('should remove member from club', async () => {
      await BookClub.addMember(testClub.clubId, testUserId2, 'member');
      await BookClub.removeMember(testClub.clubId, testUserId2);
      
      const isMember = await BookClub.isMember(testClub.clubId, testUserId2);
      expect(isMember).toBe(false);
    });

    test('should get club members', async () => {
      await BookClub.addMember(testClub.clubId, testUserId2, 'member');
      
      const members = await BookClub.getMembers(testClub.clubId);
      expect(members).toHaveLength(2); // admin + member
      
      const userIds = members.map(m => m.userId);
      expect(userIds).toContain(testUserId);
      expect(userIds).toContain(testUserId2);
    });

    test('should get user clubs', async () => {
      const clubs = await BookClub.getUserClubs(testUserId);
      expect(clubs).toHaveLength(1);
      expect(clubs[0]).toMatchObject({
        clubId: testClub.clubId,
        name: 'Test Book Club',
        userRole: 'admin',
      });
    });
  });

  describe('update', () => {
    test('should update club properties', async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club',
      };
      const club = await BookClub.create(clubData, testUserId);

      // Add a small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const updates = {
        name: 'Updated Club Name',
        description: 'Updated description',
      };

      const updatedClub = await BookClub.update(club.clubId, updates);

      expect(updatedClub).toMatchObject({
        clubId: club.clubId,
        name: 'Updated Club Name',
        description: 'Updated description',
      });
      expect(new Date(updatedClub.updatedAt).getTime()).toBeGreaterThan(new Date(club.updatedAt).getTime());
    });
  });

  describe('regenerateInviteCode', () => {
    test('should generate new invite code', async () => {
      const clubData = {
        name: 'Test Book Club',
        description: 'A test club',
      };
      const club = await BookClub.create(clubData, testUserId);
      const originalCode = club.inviteCode;

      const updatedClub = await BookClub.regenerateInviteCode(club.clubId);

      expect(updatedClub.inviteCode).not.toBe(originalCode);
      expect(updatedClub.inviteCode).toHaveLength(8);
    });
  });
});