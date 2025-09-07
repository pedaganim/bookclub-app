import React, { useState, useEffect } from 'react';
import { PlusIcon, MapIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { LocationService } from '../services/location';
import { Group, LocationData } from '../types';
import GroupCard from '../components/GroupCard';
import CreateGroupModal from '../components/CreateGroupModal';

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [nearbyGroups, setNearbyGroups] = useState<Group[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [joinLoadingIds, setJoinLoadingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'all' | 'nearby'>('all');
  const [error, setError] = useState<string>('');

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.listGroups({ limit: 50 });
      setGroups(response.items);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const loadNearbyGroups = React.useCallback(async () => {
    if (!currentLocation) return;

    try {
      const response = await apiService.getNearbyGroups({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: 25, // 25km radius
        limit: 50,
      });
      setNearbyGroups(response.items);
    } catch (error) {
      console.error('Failed to load nearby groups:', error);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (currentLocation) {
      loadNearbyGroups();
    }
  }, [currentLocation, loadNearbyGroups]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setError('');

    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      setView('nearby');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoinLoadingIds(prev => new Set(prev).add(groupId));
    try {
      await apiService.joinGroup(groupId);
      // Refresh both lists
      await loadGroups();
      if (currentLocation) {
        await loadNearbyGroups();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join group');
    } finally {
      setJoinLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    setJoinLoadingIds(prev => new Set(prev).add(groupId));
    try {
      await apiService.leaveGroup(groupId);
      // Refresh both lists
      await loadGroups();
      if (currentLocation) {
        await loadNearbyGroups();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to leave group');
    } finally {
      setJoinLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const handleGroupCreated = () => {
    loadGroups();
    if (currentLocation) {
      loadNearbyGroups();
    }
  };

  const currentGroups = view === 'nearby' ? nearbyGroups : groups;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setView('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              view === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ListBulletIcon className="w-5 h-5" />
            <span>All Groups</span>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
              {groups.length}
            </span>
          </button>

          <button
            onClick={() => {
              if (currentLocation) {
                setView('nearby');
              } else {
                getCurrentLocation();
              }
            }}
            disabled={isLoadingLocation}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              view === 'nearby'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <MapIcon className="w-5 h-5" />
            <span>
              {isLoadingLocation ? 'Getting location...' : 'Nearby Groups'}
            </span>
            {currentLocation && (
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                {nearbyGroups.length}
              </span>
            )}
          </button>
        </div>

        {currentLocation && view === 'nearby' && (
          <p className="text-sm text-gray-600">
            Showing groups within 25km of your location
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse"></div>
          ))}
        </div>
      ) : currentGroups.length === 0 ? (
        <div className="text-center py-12">
          <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {view === 'nearby' ? 'No nearby groups found' : 'No groups yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {view === 'nearby'
              ? 'Try expanding your search area or create a new group for your location.'
              : 'Be the first to create a group and start building your book club community.'}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentGroups.map((group) => (
            <GroupCard
              key={group.groupId}
              group={group}
              currentUserLocation={currentLocation || undefined}
              onJoinGroup={handleJoinGroup}
              onLeaveGroup={handleLeaveGroup}
              isCurrentUserMember={false} // TODO: Implement user membership checking
              isLoading={joinLoadingIds.has(group.groupId)}
            />
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Groups;