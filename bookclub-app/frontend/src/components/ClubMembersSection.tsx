import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  UserMinusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import ConfirmationModal from './ConfirmationModal';

export type Member = { 
  clubId: string; 
  userId: string; 
  role: 'admin' | 'member'; 
  status: string; 
  joinedAt: string; 
  name?: string; 
  email?: string; 
  profilePicture?: string 
};

interface ClubMembersSectionProps {
  clubId: string;
  isAdmin: boolean;
  createdBy?: string;
  onStatusChange?: () => void;
  className?: string;
}

const ClubMembersSection: React.FC<ClubMembersSectionProps> = ({ 
  clubId, 
  isAdmin, 
  createdBy,
  onStatusChange,
  className = ''
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiService.listMembers(clubId);
      setMembers(res.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async () => {
    if (!clubId || !memberToRemove) return;
    try {
      setActing(memberToRemove.userId);
      await apiService.removeMember(clubId, memberToRemove.userId);
      addNotification?.('success', 'Member removed successfully');
      setMembers(prev => prev.filter(m => m.userId !== memberToRemove.userId));
      onStatusChange?.();
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to remove member');
    } finally {
      setActing(null);
      setMemberToRemove(null);
    }
  };

  const handleRoleUpdate = async (targetUserId: string, newRole: 'admin' | 'member') => {
    if (!clubId) return;
    const action = newRole === 'admin' ? 'promoted' : 'demoted';
    try {
      setActing(targetUserId);
      await apiService.updateMemberRole(clubId, targetUserId, newRole);
      addNotification?.('success', `Member ${action} successfully`);
      setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m));
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to update role');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading members...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{error}</div>;

  return (
    <div className={`space-y-3 ${className}`}>
      <ul className="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {members.map((m) => (
          <li key={m.userId} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 overflow-hidden shrink-0">
                  {m.profilePicture ? (
                    <img src={m.profilePicture} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-indigo-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {m.name || (m.userId === user?.userId ? 'You' : `User ${m.userId.slice(-6)}`)}
                    </span>
                    {m.role === 'admin' && (
                      <ShieldCheckIcon className="h-3.5 w-3.5 text-amber-500" title="Admin" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{m.email}</div>
                </div>
              </div>

              {isAdmin && m.userId !== user?.userId && (
                <div className="flex items-center gap-1 ml-4">
                  {m.role === 'member' ? (
                    <button
                      onClick={() => handleRoleUpdate(m.userId, 'admin')}
                      disabled={acting === m.userId}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Make Admin"
                    >
                      <ShieldCheckIcon className="h-4 w-4" />
                    </button>
                  ) : (
                    m.userId !== createdBy && (
                      <button
                        onClick={() => handleRoleUpdate(m.userId, 'member')}
                        disabled={acting === m.userId}
                        className="p-2 text-amber-600 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Remove Admin"
                      >
                        <UserIcon className="h-4 w-4" />
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setMemberToRemove(m)}
                    disabled={acting === m.userId}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Member"
                  >
                    {acting === m.userId ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
                    ) : (
                      <UserMinusIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmationModal
        isOpen={!!memberToRemove}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.name || 'this member'}?`}
        confirmText="Remove"
        onConfirm={handleRemove}
        onCancel={() => setMemberToRemove(null)}
        isDestructive={true}
      />
    </div>
  );
};

export default ClubMembersSection;
