const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.NODE_ENV === 'test';

class BookClub {
  static toSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async isSlugTaken(slug, excludeClubId = null) {
    const existing = await this.getBySlug(slug);
    if (!existing) return false;
    if (excludeClubId && existing.clubId === excludeClubId) return false;
    return true;
  }

  static async create(clubData, createdBy) {
    const clubId = uuidv4();
    const inviteCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const timestamp = new Date().toISOString();

    // slug is mandatory — derive from name if not provided
    const slug = clubData.slug ? clubData.slug.trim() : this.toSlug(clubData.name);
    if (!slug) throw Object.assign(new Error('Slug is required'), { statusCode: 400 });

    if (await this.isSlugTaken(slug)) {
      throw Object.assign(
        new Error(`The URL slug "${slug}" is already taken. Please choose a different one.`),
        { statusCode: 409 }
      );
    }

    const club = {
      clubId,
      name: clubData.name,
      slug,
      description: clubData.description || '',
      location: clubData.location,
      createdBy,
      inviteCode,
      isPrivate: clubData.isPrivate || false,
      memberLimit: clubData.memberLimit || null,
      memberCount: 0, // Will be incremented to 1 by the addMember call below
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage.createClub(club);
      await this.addMember(clubId, createdBy, 'admin');
      const updatedClub = await this.getById(clubId);
      return updatedClub || club;
    }

    await dynamoDb.put(getTableName('bookclub-groups'), club);
    // Add creator as admin member
    await this.addMember(clubId, createdBy, 'admin');
    const updatedClub = await this.getById(clubId);
    return updatedClub || club;
  }

  static async listPendingRequests(clubId) {
    if (isOffline()) {
      const all = await LocalStorage.getClubMembers(clubId);
      return (all || []).filter(m => m.status === 'pending');
    }
    const params = {
      TableName: getTableName('bookclub-members'),
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId, ':pending': 'pending' },
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
    };
    const result = await dynamoDb.query(params);
    return result.Items || [];
  }

  static async approveJoinRequest(clubId, userId) {
    const timestamp = new Date().toISOString();
    if (isOffline()) {
      const member = await LocalStorage.getClubMember(clubId, userId);
      const updated = { ...(member || { clubId, userId, role: 'member' }), status: 'active', joinedAt: timestamp };
      await LocalStorage.createClubMember(updated);
      return updated;
    }
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = dynamoDb.generateUpdateExpression({ status: 'active', joinedAt: timestamp });
    const params = {
      TableName: getTableName('bookclub-members'),
      Key: { clubId, userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    const updatedMember = result.Attributes;
    
    // Update memberCount
    try {
      await this.recalculateMemberCount(clubId);
    } catch (e) {
      console.error('Failed to update memberCount in approveJoinRequest:', e);
    }

    return updatedMember;
  }

  static async rejectJoinRequest(clubId, userId) {
    if (isOffline()) {
      await LocalStorage.deleteClubMember(clubId, userId);
      return { success: true };
    }
    await dynamoDb.delete(getTableName('bookclub-members'), { clubId, userId });
    return { success: true };
  }

  static async listPublicClubs(limit = 10, nextToken = null, search = null) {
    if (isOffline()) {
      let clubs = await LocalStorage.listClubs();
      clubs = (clubs || []).filter(c => !c.isPrivate);
      if (search) {
        const q = search.toLowerCase();
        clubs = clubs.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q));
      }
      return { items: clubs.slice(0, limit), nextToken: clubs.length > limit ? 'has-more' : null };
    }
    const params = {
      TableName: getTableName('bookclub-groups'),
      Limit: limit,
      FilterExpression: 'attribute_not_exists(isPrivate) OR isPrivate = :false',
      ExpressionAttributeValues: { ':false': false },
    };
    if (search) {
      params.FilterExpression += ' AND (contains(#name, :q) OR contains(#desc, :q) OR contains(#loc, :q))';
      params.ExpressionAttributeNames = { ...(params.ExpressionAttributeNames || {}), '#name': 'name', '#desc': 'description', '#loc': 'location' };
      params.ExpressionAttributeValues[':q'] = search;
    }
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }
    const result = await dynamoDb.scan(params);
    return {
      items: await Promise.all((result.Items || []).map(async c => {
        if (c.memberCount === undefined || c.memberCount === 0) {
          return await this.recalculateMemberCount(c.clubId, c);
        }
        return c;
      })),
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null,
    };
  }

  static async getById(clubId) {
    if (isOffline()) {
      return LocalStorage.getClubById(clubId);
    }
    return dynamoDb.get(getTableName('bookclub-groups'), { clubId });
  }

  static async getByInviteCode(inviteCode) {
    if (isOffline()) {
      return LocalStorage.getClubByInviteCode(inviteCode);
    }
    const params = {
      TableName: getTableName('bookclub-groups'),
      IndexName: 'InviteCodeIndex',
      KeyConditionExpression: 'inviteCode = :inviteCode',
      ExpressionAttributeValues: { ':inviteCode': inviteCode },
      Limit: 1,
    };
    const result = await dynamoDb.query(params);
    return (result.Items && result.Items[0]) || null;
  }

  static async getBySlug(slug) {
    if (isOffline()) {
      const clubs = await LocalStorage.listClubs();
      return (clubs || []).find(c => c.slug === slug) || null;
    }
    // Try the GSI first; fall back to a full scan if the index doesn't exist yet
    try {
      const params = {
        TableName: getTableName('bookclub-groups'),
        IndexName: 'SlugIndex',
        KeyConditionExpression: '#slug = :slug',
        ExpressionAttributeNames: { '#slug': 'slug' },
        ExpressionAttributeValues: { ':slug': slug },
        Limit: 1,
      };
      const result = await dynamoDb.query(params);
      return (result.Items && result.Items[0]) || null;
    } catch (err) {
      if (err.code === 'ValidationException' || (err.message && err.message.includes('SlugIndex'))) {
        // Index not yet deployed — fall back to scan
        const scanParams = {
          TableName: getTableName('bookclub-groups'),
          FilterExpression: '#slug = :slug',
          ExpressionAttributeNames: { '#slug': 'slug' },
          ExpressionAttributeValues: { ':slug': slug },
        };
        const scanResult = await dynamoDb.scan(scanParams);
        return (scanResult.Items && scanResult.Items[0]) || null;
      }
      throw err;
    }
  }

  static async update(clubId, updates) {
    const timestamp = new Date().toISOString();

    if (updates.slug !== undefined) {
      const slug = updates.slug.trim();
      if (!slug) throw Object.assign(new Error('Slug cannot be empty'), { statusCode: 400 });
      if (await this.isSlugTaken(slug, clubId)) {
        throw Object.assign(
          new Error(`The URL slug "${slug}" is already taken. Please choose a different one.`),
          { statusCode: 409 }
        );
      }
      updates.slug = slug;
    }

    if (isOffline()) {
      const existing = await LocalStorage.getClubById(clubId);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: timestamp };
      await LocalStorage.createClub(updated);
      return updated;
    }

    const updateData = { ...updates, updatedAt: timestamp };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updateData);
    const params = {
      TableName: getTableName('bookclub-groups'),
      Key: { clubId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async delete(clubId) {
    if (isOffline()) {
      await LocalStorage.deleteClub(clubId);
      await LocalStorage.deleteAllClubMembers(clubId);
      return;
    }

    // Delete all members first
    await this.deleteAllMembers(clubId);
    // Then delete the club
    await dynamoDb.delete(getTableName('bookclub-groups'), { clubId });
  }

  static async addMember(clubId, userId, role = 'member') {
    const timestamp = new Date().toISOString();
    const membership = {
      clubId,
      userId,
      role,
      joinedAt: timestamp,
      status: 'active',
    };

    if (isOffline()) {
      await LocalStorage.createClubMember(membership);
      return membership;
    }

    await dynamoDb.put(getTableName('bookclub-members'), membership);

    // Update memberCount by recalculating (safest)
    try {
      await this.recalculateMemberCount(clubId);
    } catch (e) {
      console.error('Failed to recalculate memberCount in addMember:', e);
    }

    return membership;
  }

  static async createJoinRequest(clubId, userId) {
    const timestamp = new Date().toISOString();
    const record = {
      clubId,
      userId,
      role: 'member',
      joinedAt: null,
      status: 'pending',
      requestedAt: timestamp,
    };

    if (isOffline()) {
      // In offline, overwrite or create a pending record
      await LocalStorage.createClubMember(record);
      return record;
    }

    // Check if already a member
    const existing = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    if (existing && existing.status === 'active') {
      const err = new Error('Already a member of this club');
      err.code = 'AlreadyMember';
      throw err;
    }

    await dynamoDb.put(getTableName('bookclub-members'), record);
    return record;
  }

  static async removeMember(clubId, userId) {
    if (isOffline()) {
      await LocalStorage.deleteClubMember(clubId, userId);
      return;
    }

    await dynamoDb.delete(getTableName('bookclub-members'), { clubId, userId });

    // Update memberCount
    try {
      await this.recalculateMemberCount(clubId);
    } catch (e) {
      console.error('Failed to update memberCount in removeMember:', e);
    }
  }

  static async updateMemberRole(clubId, userId, newRole) {
    if (!['admin', 'member'].includes(newRole)) {
      throw new Error('Invalid role');
    }

    if (isOffline()) {
      const member = await LocalStorage.getClubMember(clubId, userId);
      if (!member) throw new Error('Member not found');
      const updated = { ...member, role: newRole };
      await LocalStorage.createClubMember(updated);
      return updated;
    }

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = dynamoDb.generateUpdateExpression({ role: newRole });
    const params = {
      TableName: getTableName('bookclub-members'),
      Key: { clubId, userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async getMembers(clubId) {
    if (isOffline()) {
      return LocalStorage.getClubMembers(clubId);
    }

    const params = {
      TableName: getTableName('bookclub-members'),
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
    };
    const result = await dynamoDb.query(params);
    return result.Items || [];
  }

  static async getUserClubs(userId) {
    if (isOffline()) {
      const memberships = await LocalStorage.getUserClubs(userId);
      // Get club details for each membership
      const clubs = [];
      for (const membership of memberships) {
        const club = await LocalStorage.getClubById(membership.clubId);
        if (club) {
          clubs.push({
            ...club,
            userRole: membership.role,
            joinedAt: membership.joinedAt,
            userStatus: membership.status || 'active',
          });
        }
      }
      return clubs;
    }

    const params = {
      TableName: getTableName('bookclub-members'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    };
    const memberships = await dynamoDb.query(params);
    const items = memberships.Items || [];

    // Get club details for each membership
    const clubs = [];
    for (const membership of items) {
      const club = await this.getById(membership.clubId);
      if (club) {
        clubs.push({
          ...club,
          userRole: membership.role,
          joinedAt: membership.joinedAt,
          userStatus: membership.status || 'active',
        });
      }
    }
    return await Promise.all(clubs.map(async c => {
      if (c.memberCount === undefined || c.memberCount === 0) {
        return await this.recalculateMemberCount(c.clubId, c);
      }
      return c;
    }));
  }

  static async recalculateMemberCount(clubId, clubData = null) {
    const members = await this.getMembers(clubId);
    const activeMembers = members.filter(m => m.status === 'active');
    const count = activeMembers.length;
    
    const club = clubData || await this.getById(clubId);
    if (club) {
      const updated = await this.update(clubId, { memberCount: count });
      return updated;
    }
    return club;
  }

  static async isMember(clubId, userId) {
    if (isOffline()) {
      return LocalStorage.isClubMember(clubId, userId);
    }

    const result = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    return result !== null && result.status === 'active';
  }

  static async getSharedClubIds(userAId, userBId) {
    const clubsA = await this.getUserClubs(userAId);
    const clubsB = await this.getUserClubs(userBId);

    const activeIdsA = new Set(clubsA.filter(c => c.userStatus === 'active').map(c => c.clubId));
    const activeIdsB = new Set(clubsB.filter(c => c.userStatus === 'active').map(c => c.clubId));

    const intersection = [...activeIdsA].filter(id => activeIdsB.has(id));
    return intersection;
  }

  static async getMemberRecord(clubId, userId) {
    if (isOffline()) {
      return LocalStorage.getClubMember(clubId, userId) || null;
    }
    const result = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    return result || null;
  }

  static async getMemberRole(clubId, userId) {
    if (isOffline()) {
      const member = await LocalStorage.getClubMember(clubId, userId);
      return member?.role || null;
    }

    const result = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    return result?.role || null;
  }

  static async deleteAllMembers(clubId) {
    if (isOffline()) {
      await LocalStorage.deleteAllClubMembers(clubId);
      return;
    }

    const members = await this.getMembers(clubId);
    for (const member of members) {
      await this.removeMember(clubId, member.userId);
    }
  }

  static async regenerateInviteCode(clubId) {
    const newInviteCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    return this.update(clubId, { inviteCode: newInviteCode });
  }

  // --- Email invite methods ---

  static async addEmailInvites(clubId, emails, invitedBy) {
    const timestamp = new Date().toISOString();
    const results = [];
    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;
      const invite = { clubId, email, invitedBy, status: 'pending', createdAt: timestamp };
      if (isOffline()) {
        await LocalStorage.createEmailInvite(invite);
      } else {
        await dynamoDb.put(getTableName('club-email-invites'), { ...invite, pk: `${clubId}:${email}` });
      }
      results.push(invite);
    }
    return results;
  }

  static async listEmailInvites(clubId) {
    if (isOffline()) {
      return LocalStorage.listEmailInvitesByClub(clubId);
    }
    const params = {
      TableName: getTableName('club-email-invites'),
      IndexName: 'ClubIdIndex',
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
    };
    const result = await dynamoDb.query(params);
    return result.Items || [];
  }

  static async revokeEmailInvite(clubId, email) {
    const norm = email.trim().toLowerCase();
    if (isOffline()) {
      return LocalStorage.deleteEmailInvite(clubId, norm);
    }
    await dynamoDb.delete(getTableName('club-email-invites'), { pk: `${clubId}:${norm}` });
    return true;
  }

  // Called at login: check if the user's email has any pending invites and auto-approve them
  static async checkAndApplyEmailInvites(userId, email) {
    if (!email) return;
    let pendingInvites = [];
    if (isOffline()) {
      pendingInvites = await LocalStorage.getEmailInviteByEmail(email);
    } else {
      const params = {
        TableName: getTableName('club-email-invites'),
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        FilterExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':email': email.toLowerCase(), ':pending': 'pending' },
      };
      const result = await dynamoDb.query(params).catch(() => ({ Items: [] }));
      pendingInvites = result.Items || [];
    }

    for (const invite of pendingInvites) {
      try {
        // Check not already a member
        const existing = isOffline()
          ? await LocalStorage.getClubMember(invite.clubId, userId)
          : await dynamoDb.get(getTableName('bookclub-members'), { clubId: invite.clubId, userId }).catch(() => null);
        if (existing && existing.status === 'active') continue;

        await this.addMember(invite.clubId, userId, 'member');
        if (isOffline()) {
          await LocalStorage.markEmailInviteAccepted(invite.clubId, email);
        } else {
          await dynamoDb.update({
            TableName: getTableName('club-email-invites'),
            Key: { pk: `${invite.clubId}:${email.toLowerCase()}` },
            UpdateExpression: 'SET #s = :accepted, acceptedAt = :ts',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':accepted': 'accepted', ':ts': new Date().toISOString() },
          }).catch(() => {});
        }
        console.log(`[EmailInvite] Auto-approved ${email} into club ${invite.clubId}`);
      } catch (e) {
        console.warn(`[EmailInvite] Failed to auto-approve ${email} for club ${invite.clubId}:`, e.message);
      }
    }
  }
}

module.exports = BookClub;