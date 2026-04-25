import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookClub } from '../types';
import { 
  UserGroupIcon, 
  MapPinIcon,
  Cog6ToothIcon,
  TrashIcon,
  UserPlusIcon,
  InboxArrowDownIcon,
  ClipboardDocumentIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface ClubCardProps {
  club: BookClub;
  isCreator?: boolean;
  isAdmin?: boolean;
  isMember?: boolean;
  isRequested?: boolean;
  isJoining?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageRequests?: () => void;
  onManageMembers?: () => void;
  onCopyInvite?: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ 
  club, 
  isCreator,
  isAdmin,
  isMember,
  isRequested,
  isJoining,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onManageRequests,
  onManageMembers,
  onCopyInvite
}) => {
  const navigate = useNavigate();

  const handleAction = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    if (callback) callback();
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
      onClick={() => navigate(`/clubs/${club.clubId}/explore`)}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{club.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {isCreator && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                    Admin
                  </span>
                )}
                {isAdmin && !isCreator && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    Admin
                  </span>
                )}
                {isMember && !isAdmin && !isCreator && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    Member
                  </span>
                )}
                {isRequested && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                    Request Sent
                  </span>
                )}
                {club.isPrivate && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                    Private
                  </span>
                )}
              </div>
            </div>
            {club.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                {club.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-gray-500 mb-6">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-3.5 w-4 text-gray-400" />
            <span>{club.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-3.5 w-4 text-gray-400" />
            <span>{club.memberCount || 0} Members</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-gray-50">
        <button
          onClick={(e) => handleAction(e, () => navigate(`/clubs/${club.clubId}/explore`))}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          title="Explore Club"
        >
          <MagnifyingGlassIcon className="h-3.5 w-3.5" />
          Explore
        </button>

        {!isMember && !isCreator && !isRequested && onJoin && (
          <button
            onClick={(e) => handleAction(e, onJoin)}
            disabled={isJoining}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <UserPlusIcon className="h-3.5 w-3.5" />
            {isJoining ? 'Joining...' : 'Join Club'}
          </button>
        )}

        {isCreator && (
          <>
            <button
              onClick={(e) => handleAction(e, onEdit)}
              className="flex items-center justify-center p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Edit Club"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleAction(e, onDelete)}
              className="flex items-center justify-center p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Delete Club"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}

        {isAdmin && !isCreator && onLeave && (
          <button
            onClick={(e) => handleAction(e, onLeave)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            title="Leave Club"
          >
            <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />
            Leave
          </button>
        )}

        {isAdmin && (
          <>
            <button
              onClick={(e) => handleAction(e, onManageMembers)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              title="Manage Members"
            >
              <UserGroupIcon className="h-3.5 w-3.5" />
              Members
            </button>
            <button
              onClick={(e) => handleAction(e, onManageRequests)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Manage Requests"
            >
              <InboxArrowDownIcon className="h-3.5 w-3.5" />
              Requests
            </button>
            <button
              onClick={(e) => handleAction(e, onCopyInvite)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              title="Copy Invite Code"
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              Invite
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ClubCard;