import React, { useEffect, useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateClubModal from '../components/CreateClubModal';
import EditClubModal from '../components/EditClubModal';
import JoinClubModal from '../components/JoinClubModal';
import ManageRequestsModal from '../components/ManageRequestsModal';
import InviteModal from '../components/InviteModal';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';

const Clubs: React.FC = () => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingClub, setEditingClub] = useState<BookClub | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [manageClubId, setManageClubId] = useState<string | null>(null);
  const [inviteClub, setInviteClub] = useState<BookClub | null>(null);
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

  const isCreator = (club: BookClub) => user?.userId && club.createdBy === user.userId;
  const isAdmin = (club: BookClub) => club.userRole === 'admin' || isCreator(club);
  const isPending = (club: BookClub) => club.userStatus === 'pending';

  const handleDelete = async (club: BookClub) => {
    if (!isCreator(club)) return;
    if (!window.confirm(`Delete club "${club.name}"? This cannot be undone.`)) return;
    try {
      await apiService.deleteClub(club.clubId);
      setClubs(prev => prev.filter(c => c.clubId !== club.clubId));
    } catch (e: any) {
      alert(e.message || 'Failed to delete club');
    }
  };

  const handleEdit = (club: BookClub) => {
    if (!isCreator(club)) return;
    setEditingClub(club);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJoin(true)} className="px-3 py-2 text-sm bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50">Join Club</button>
            <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create Club</button>
          </div>
        </div>
        {/* Secondary tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <NavLink
              to="/clubs"
              end
              className={({ isActive }) =>
                `whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
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
                `whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
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
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {(!Array.isArray(clubs) || clubs.length === 0) ? (
          <div className="text-gray-700 bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-lg font-medium mb-2">You have no clubs yet</div>
            <p className="text-sm mb-4">Browse public clubs to discover communities and request to join.</p>
            <button
              onClick={() => navigate('/clubs/browse')}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Browse Clubs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {clubs.map((club) => (
              <div key={club.clubId} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">{club.name}</h2>
                      {isCreator(club) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Creator</span>
                      )}
                      {club.isPrivate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">Private</span>
                      )}
                      {isPending(club) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Pending</span>
                      )}
                    </div>
                    {club.description && (
                      <p className="text-sm text-gray-600 mt-1">{club.description}</p>
                    )}
                    <div className="text-sm text-gray-500 mt-1">{club.location}</div>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin(club) && !isPending(club) && (
                      <>
                        <button onClick={() => setInviteClub(club)} className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100">Invite</button>
                        <button onClick={() => handleEdit(club)} className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100">Edit</button>
                        <button onClick={() => handleDelete(club)} className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100">Delete</button>
                        <button onClick={() => setManageClubId(club.clubId)} className="px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100">Manage Requests</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
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

        {inviteClub && (
          <InviteModal
            club={inviteClub}
            onClose={() => setInviteClub(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Clubs;
