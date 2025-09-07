const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');

class Group {
  static async create(groupData, userId) {
    const groupId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const group = {
      groupId,
      name: groupData.name,
      description: groupData.description || '',
      location: groupData.location, // { latitude: number, longitude: number, address?: string }
      createdBy: userId,
      memberCount: 1,
      members: [userId], // Initial member is the creator
      isPublic: groupData.isPublic !== false, // Default to public
      maxMembers: groupData.maxMembers || 50,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDb.put(getTableName('groups'), group);
    return group;
  }

  static async getById(groupId) {
    return dynamoDb.get(getTableName('groups'), { groupId });
  }

  static async listAll(limit = 10, nextToken = null) {
    const params = {
      TableName: getTableName('groups'),
      Limit: limit,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await dynamoDb.scan(params);
    
    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? 
        Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
        null,
    };
  }

  static async listNearby(userLocation, radiusKm = 10, limit = 10) {
    // Get all groups and filter by distance
    // In a production system, this would use a geospatial index
    const allGroups = await this.listAll(1000); // Get more groups for filtering
    
    const nearbyGroups = allGroups.items.filter(group => {
      if (!group.location || !group.location.latitude || !group.location.longitude) {
        return false;
      }
      
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        group.location.latitude,
        group.location.longitude
      );
      
      return distance <= radiusKm;
    });

    // Sort by distance and limit results
    nearbyGroups.sort((a, b) => {
      const distanceA = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.location.latitude,
        a.location.longitude
      );
      const distanceB = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.location.latitude,
        b.location.longitude
      );
      return distanceA - distanceB;
    });

    return {
      items: nearbyGroups.slice(0, limit),
      nextToken: null, // Simplified for now
    };
  }

  static async joinGroup(groupId, userId) {
    const group = await this.getById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.members && group.members.includes(userId)) {
      throw new Error('User is already a member of this group');
    }

    if (group.memberCount >= group.maxMembers) {
      throw new Error('Group is full');
    }

    const updateData = {
      members: [...(group.members || []), userId],
      memberCount: (group.memberCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('groups'),
      Key: { groupId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async leaveGroup(groupId, userId) {
    const group = await this.getById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.members || !group.members.includes(userId)) {
      throw new Error('User is not a member of this group');
    }

    // Don't allow the creator to leave if there are other members
    if (group.createdBy === userId && group.memberCount > 1) {
      throw new Error('Group creator cannot leave while there are other members');
    }

    const updateData = {
      members: group.members.filter(memberId => memberId !== userId),
      memberCount: Math.max(0, (group.memberCount || 1) - 1),
      updatedAt: new Date().toISOString(),
    };

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('groups'),
      Key: { groupId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = Group;