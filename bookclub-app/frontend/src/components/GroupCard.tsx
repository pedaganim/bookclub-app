import React from 'react';
import { MapPinIcon, UsersIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Group, LocationData } from '../types';
import { LocationService } from '../services/location';

interface GroupCardProps {
  group: Group;
  currentUserLocation?: LocationData;
  onJoinGroup?: (groupId: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onViewGroup?: (groupId: string) => void;
  isCurrentUserMember?: boolean;
  isLoading?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUserLocation,
  onJoinGroup,
  onLeaveGroup,
  onViewGroup,
  isCurrentUserMember = false,
  isLoading = false,
}) => {
  const distance = currentUserLocation
    ? LocationService.calculateDistance(
        currentUserLocation.latitude,
        currentUserLocation.longitude,
        group.location.latitude,
        group.location.longitude
      )
    : null;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentUserMember && onLeaveGroup) {
      onLeaveGroup(group.groupId);
    } else if (!isCurrentUserMember && onJoinGroup) {
      onJoinGroup(group.groupId);
    }
  };

  const handleCardClick = () => {
    if (onViewGroup) {
      onViewGroup(group.groupId);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-1 text-gray-500">
          {group.isPublic ? (
            <GlobeAltIcon className="w-4 h-4" title="Public group" />
          ) : (
            <LockClosedIcon className="w-4 h-4" title="Private group" />
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span>
            {group.memberCount} / {group.maxMembers} members
          </span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPinIcon className="w-4 h-4" />
          <span>
            {group.location.address || `${group.location.latitude.toFixed(4)}, ${group.location.longitude.toFixed(4)}`}
            {distance && (
              <span className="ml-2 text-indigo-600 font-medium">
                ({LocationService.formatDistance(distance)} away)
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Created {new Date(group.createdAt).toLocaleDateString()}
        </div>

        {(onJoinGroup || onLeaveGroup) && (
          <button
            onClick={handleActionClick}
            disabled={isLoading || (group.memberCount >= group.maxMembers && !isCurrentUserMember)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isCurrentUserMember
                ? 'text-red-600 border border-red-300 hover:bg-red-50'
                : group.memberCount >= group.maxMembers
                ? 'text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'text-indigo-600 border border-indigo-300 hover:bg-indigo-50'
            } disabled:opacity-50`}
          >
            {isLoading
              ? '...'
              : isCurrentUserMember
              ? 'Leave'
              : group.memberCount >= group.maxMembers
              ? 'Full'
              : 'Join'
            }
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupCard;