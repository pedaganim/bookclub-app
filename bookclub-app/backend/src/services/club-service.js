const BookClub = require('../models/bookclub');
const logger = require('../lib/logger');

class ClubService {
  /**
   * Creates a new book club.
   * @param {Object} clubData - Initial club data.
   * @param {string} userId - User ID of the creator.
   * @returns {Promise<Object>} The created club.
   */
  static async create(clubData, userId) {
    logger.info({ userId, clubName: clubData.name }, 'Creating new club');

    // Business logic: Ensure slug is unique if provided (Model handles some of this, but Service can orchestrate)
    if (clubData.slug) {
      const existing = await BookClub.getBySlug(clubData.slug);
      if (existing) {
        throw new Error('VALIDATION_ERROR:Club slug already in use');
      }
    }

    const club = await BookClub.create(clubData, userId);
    
    logger.info({ clubId: club.clubId }, 'Club created successfully');
    return club;
  }

  /**
   * Updates an existing club.
   * @param {string} clubId - ID of the club.
   * @param {Object} updates - Update fields.
   * @param {string} userId - ID of the user performing update.
   * @returns {Promise<Object>} The updated club.
   */
  static async update(clubId, updates, userId) {
    logger.info({ clubId, userId }, 'Updating club');
    
    // Permission check is usually handled by middleware, but Service can double check
    const club = await BookClub.getById(clubId);
    if (!club) throw new Error('NOT_FOUND:Club not found');

    const updated = await BookClub.update(clubId, updates);
    
    logger.info({ clubId }, 'Club updated successfully');
    return updated;
  }

  /**
   * Retrieves a club by ID and attaches user-specific membership info.
   * @param {string} clubId - ID of the club.
   * @param {string} userId - Optional ID of the user viewing.
   * @returns {Promise<Object>} The club with membership info.
   */
  static async getById(clubId, userId = null) {
    logger.info({ clubId, userId }, 'Getting club details');

    const club = await BookClub.getById(clubId);
    if (!club) throw new Error('NOT_FOUND:Club not found');

    let isMember = false;
    let userRole = null;
    let userStatus = null;

    if (userId) {
      const memberRecord = await BookClub.getMemberRecord(clubId, userId);
      if (memberRecord) {
        userStatus = memberRecord.status || null;
        isMember = userStatus === 'active';
        userRole = memberRecord.role || null;
      }
    }

    return {
      ...club,
      isMember,
      userRole,
      userStatus,
    };
  }

  /**
   * Lists active members of a club with enriched user data.
   * @param {string} clubId - ID of the club.
   * @returns {Promise<Array>} List of enriched memberships.
   */
  static async listMembers(clubId) {
    logger.info({ clubId }, 'Listing club members');

    const club = await BookClub.getById(clubId);
    if (!club) throw new Error('NOT_FOUND:Club not found');

    const allMemberships = await BookClub.getMembers(clubId);
    const activeMemberships = allMemberships.filter(m => m.status === 'active');

    // Enrich with user names/emails
    const UserService = require('./user-service');
    const enrichedMembers = await Promise.all(activeMemberships.map(async (m) => {
      try {
        const user = await UserService.getById(m.userId);
        return {
          ...m,
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          profilePicture: user?.profilePicture || null,
        };
      } catch (err) {
        logger.warn({ userId: m.userId, err }, 'Failed to enrich member data');
        return { ...m, name: 'Unknown User' };
      }
    }));

    return enrichedMembers;
  }

  /**
   * Joins a club using an invite code.
   * @param {string} inviteCode - The club's invite code.
   * @param {string} userId - ID of the user joining.
   * @returns {Promise<Object>} The club and membership info.
   */
  static async joinByInviteCode(inviteCode, userId) {
    logger.info({ userId, inviteCode }, 'Joining club via invite code');

    const club = await BookClub.getByInviteCode(inviteCode.trim().toUpperCase());
    if (!club) throw new Error('NOT_FOUND:Invalid invite code');

    const isMember = await BookClub.isMember(club.clubId, userId);
    if (isMember) throw new Error('VALIDATION_ERROR:You are already a member of this club');

    if (club.memberLimit) {
      const members = await BookClub.getMembers(club.clubId);
      if (members.length >= club.memberLimit) {
        throw new Error('VALIDATION_ERROR:This club has reached its member limit');
      }
    }

    const membership = await BookClub.addMember(club.clubId, userId, 'member');

    return {
      ...club,
      userRole: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  /**
   * Approves a club join request.
   * @param {string} clubId - ID of the club.
   * @param {string} targetUserId - ID of the user being approved.
   * @returns {Promise<Object>} The updated membership.
   */
  static async approveRequest(clubId, targetUserId) {
    logger.info({ clubId, targetUserId }, 'Approving join request');
    const updated = await BookClub.approveJoinRequest(clubId, targetUserId);
    logger.info({ clubId, targetUserId }, 'Join request approved');
    return updated;
  }

  /**
   * Rejects a club join request.
   * @param {string} clubId - ID of the club.
   * @param {string} targetUserId - ID of the user being rejected.
   * @returns {Promise<boolean>}
   */
  static async rejectRequest(clubId, targetUserId) {
    logger.info({ clubId, targetUserId }, 'Rejecting join request');
    await BookClub.rejectJoinRequest(clubId, targetUserId);
    logger.info({ clubId, targetUserId }, 'Join request rejected');
    return true;
  }

  /**
   * Deletes a club.
   * @param {string} clubId - ID of the club.
   * @returns {Promise<boolean>}
   */
  static async delete(clubId) {
    logger.info({ clubId }, 'Deleting club');
    
    const club = await BookClub.getById(clubId);
    if (!club) throw new Error('NOT_FOUND:Club not found');

    await BookClub.delete(clubId);
    
    logger.info({ clubId }, 'Club deleted successfully');
    return true;
  }

  /**
   * Lists clubs that a user belongs to.
   * @param {string} userId - ID of the user.
   * @returns {Promise<Array>} List of clubs.
   */
  static async listUserClubs(userId) {
    logger.info({ userId }, 'Listing user clubs');
    return BookClub.getUserClubs(userId);
  }
}

module.exports = ClubService;
