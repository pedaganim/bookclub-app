import React from 'react';
import { BookClub } from '../types';
import { 
  UserGroupIcon, 
  ClipboardDocumentIcon, 
  ArrowRightOnRectangleIcon, 
  StarIcon 
} from '@heroicons/react/24/outline';

interface ClubCardProps {
  club: BookClub;
  onLeave: (clubId: string) => void;
  onCopyInvite: (inviteCode: string) => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onLeave, onCopyInvite }) => {
  const handleLeave = () => {
    if (window.confirm(`Are you sure you want to leave "${club.name}"?`)) {
      onLeave(club.clubId);
    }
  };

  const handleCopyInvite = () => {
    onCopyInvite(club.inviteCode);
  };

  const isAdmin = club.userRole === 'admin';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
            {isAdmin && (
              <StarIcon className="h-5 w-5 text-yellow-500" title="Admin" />
            )}
            {club.isPrivate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Private
              </span>
            )}
          </div>
          {club.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{club.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <UserGroupIcon className="h-4 w-4" />
              <span>Members</span>
            </div>
            <span>•</span>
            <span>Joined {new Date(club.joinedAt || club.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copy Invite
          </button>
        )}
        <button
          onClick={handleLeave}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Leave
        </button>
      </div>
    </div>
  );
};

export default ClubCard;