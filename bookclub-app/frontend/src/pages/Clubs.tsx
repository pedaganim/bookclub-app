import React, { useEffect, useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import CreateClubModal from '../components/CreateClubModal';
import EditClubModal from '../components/EditClubModal';
import JoinClubModal from '../components/JoinClubModal';
import ManageRequestsModal from '../components/ManageRequestsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ClubCard from '../components/ClubCard';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const Clubs: React.FC = () => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [showCreate, setShowCreate] = useState(false);
  const [editingClub, setEditingClub] = useState<BookClub | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [manageClubId, setManageClubId] = useState<string | null>(null);
  const [clubToDelete, setClubToDelete] = useState<BookClub | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getUserClubs();
      setClubs(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Open Join modal if requested via navigation state
  useEffect(() => {
    const state = location.state as any;
    if (state?.openJoin) {
      setShowJoin(true);
      // clear the state so it doesn't persist on refresh/back
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  const isCreator = (club: BookClub) => !!(user?.userId && club.createdBy === user.userId);
  const isAdmin = (club: BookClub) => club.userRole === 'admin' || isCreator(club);
  const isPending = (club: BookClub) => club.userStatus === 'pending';

  const handleDelete = async () => {
    if (!clubToDelete) return;
    try {
      await apiService.deleteClub(clubToDelete.clubId);
      setClubs(prev => prev.filter(c => c.clubId !== clubToDelete.clubId));
      addNotification('success', `Club "${clubToDelete.name}" deleted successfully`);
    } catch (e: any) {
      addNotification('error', e.message || 'Failed to delete club');
    } finally {
      setClubToDelete(null);
    }
  };

  const handleCopyInvite = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    addNotification('success', 'Invite code copied to clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clubs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your communities or discover new ones.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowJoin(true)} 
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Join with Code
            </button>
            <button 
              onClick={() => setShowCreate(true)} 
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Create Club
            </button>
          </div>
        </div>

        {/* Secondary tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <NavLink
              to="/clubs"
              end
              className={({ isActive }) =>
                `whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              My Clubs
            </NavLink>
            <NavLink
              to="/clubs/browse"
              className={({ isActive }) =>
                `whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              Browse Clubs
            </NavLink>
          </nav>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-100">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {(!Array.isArray(clubs) || clubs.length === 0) ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <UserGroupIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">You have no clubs yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">Browse public clubs to discover communities and request to join.</p>
            <button
              onClick={() => navigate('/clubs/browse')}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Browse Clubs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <ClubCard
                key={club.clubId}
                club={club}
                isCreator={isCreator(club)}
                isAdmin={isAdmin(club)}
                isMember={!isPending(club)}
                isRequested={isPending(club)}
                onEdit={() => setEditingClub(club)}
                onDelete={() => setClubToDelete(club)}
                onManageRequests={() => setManageClubId(club.clubId)}
                onCopyInvite={() => handleCopyInvite(club.inviteCode)}
                onLeave={() => {
                  if (window.confirm(`Are you sure you want to leave "${club.name}"?`)) {
                    // Actual leave logic would go here, for now it's a placeholder
                    addNotification('info', 'Leave functionality coming soon');
                  }
                }}
              />
            ))}
          </div>
        )}

        {showCreate && (
          <CreateClubModal
            onClose={() => setShowCreate(false)}
            onClubCreated={(club) => { setClubs(prev => [club, ...prev]); setShowCreate(false); }}
          />
        )}

        {showJoin && (
          <JoinClubModal
            onClose={() => setShowJoin(false)}
            onClubJoined={async (club) => { setShowJoin(false); await load(); }}
          />
        )}

        {editingClub && (
          <EditClubModal
            club={editingClub as BookClub}
            onClose={() => setEditingClub(null)}
            onSave={async (updates) => {
              const current = editingClub as BookClub;
              const updated = await apiService.updateClub(current.clubId, updates);
              setClubs(prev => prev.map(c => (c.clubId === current.clubId ? updated : c)));
              setEditingClub(null);
            }}
          />
        )}

        {manageClubId && (
          <ManageRequestsModal
            clubId={manageClubId}
            onClose={() => setManageClubId(null)}
          />
        )}

        <ConfirmationModal
          isOpen={!!clubToDelete}
          title="Delete Club"
          message={`Are you sure you want to delete "${clubToDelete?.name}"? This action cannot be undone and all club data will be permanently removed.`}
          confirmText="Delete Club"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setClubToDelete(null)}
          isDestructive={true}
        />
      </div>
    </div>
  );
};

export default Clubs;
