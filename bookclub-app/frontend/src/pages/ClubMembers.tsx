import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { BookClub } from '../types';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  UserMinusIcon,
  ChevronLeftIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

type Member = { 
  clubId: string; 
  userId: string; 
  role: 'admin' | 'member'; 
  status: string; 
  joinedAt: string; 
  name?: string; 
  email?: string; 
  profilePicture?: string 
};

const ClubMembers: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [club, setClub] = useState<BookClub | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const isAdmin = useMemo(() => {
    return club?.userRole === 'admin' || club?.createdBy === user?.userId;
  }, [club, user]);

  const loadData = async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      setError('');
      const [clubRes, membersRes] = await Promise.all([
        apiService.getClub(clubId),
        apiService.listMembers(clubId)
      ]);
      setClub(clubRes);
      setMembers(membersRes.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const handleRemove = async (targetUserId: string, name?: string) => {
    if (!clubId) return;
    if (!window.confirm(`Are you sure you want to remove ${name || 'this member'} from the club?`)) return;

    try {
      setActing(targetUserId);
      await apiService.removeMember(clubId, targetUserId);
      addNotification?.('success', 'Member removed successfully');
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to remove member');
    } finally {
      setActing(null);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          <p className="mt-4 text-gray-500 font-medium">Loading members…</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="rounded-xl bg-red-50 text-red-700 p-6 border border-red-100 text-center shadow-sm">
          <p className="font-semibold mb-2">Error Loading Members</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 text-sm font-bold underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (!members.length) {
      return (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No members found</h3>
          <p className="text-gray-500 mt-1">This is unexpected. A club should have at least one admin.</p>
        </div>
      );
    }

    return (
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.userId} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 overflow-hidden flex-shrink-0">
                    {m.profilePicture ? (
                      <img src={m.profilePicture} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-6 w-6 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">
                        {m.name || (m.userId === user?.userId ? 'You' : `User ${m.userId.slice(-6)}`)}
                      </span>
                      {m.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                          <ShieldCheckIcon className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{m.email}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-tight font-medium">
                      Joined {new Date(m.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {isAdmin && m.userId !== user?.userId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemove(m.userId, m.name)}
                      disabled={acting === m.userId}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all group"
                      title="Remove Member"
                    >
                      {acting === m.userId ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                      ) : (
                        <UserMinusIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }, [members, loading, error, acting, isAdmin, user?.userId]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Member Audit</h1>
                <p className="text-sm text-gray-500 line-clamp-1">{club?.name}</p>
              </div>
            </div>
            <div className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              {members.length} Total
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin && (
          <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Admin Panel:</span> You can audit all members and remove users if necessary. Removal is permanent but they can request to join again.
            </p>
          </div>
        )}
        
        {content}
      </div>
    </div>
  );
};

export default ClubMembers;
