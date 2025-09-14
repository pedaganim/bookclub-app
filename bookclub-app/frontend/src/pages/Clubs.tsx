import React, { useEffect, useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateClubModal from '../components/CreateClubModal';

const Clubs: React.FC = () => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

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

  const isCreator = (club: BookClub) => user?.userId && club.createdBy === user.userId;

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

  const handleEdit = async (club: BookClub) => {
    if (!isCreator(club)) return;
    const name = window.prompt('Club name', club.name);
    if (name == null) return;
    const description = window.prompt('Description (optional)', club.description || '');
    try {
      const updated = await apiService.updateClub(club.clubId, {
        name: name.trim(),
        description: (description || '').trim(),
      });
      setClubs(prev => prev.map(c => (c.clubId === club.clubId ? updated : c)));
    } catch (e: any) {
      alert(e.message || 'Failed to update club');
    }
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Clubs</h1>
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create Club</button>
        </div>
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {(!Array.isArray(clubs) || clubs.length === 0) ? (
          <div className="text-gray-600">You have no clubs yet.</div>
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
                    </div>
                    {club.description && (
                      <p className="text-sm text-gray-600 mt-1">{club.description}</p>
                    )}
                    <div className="text-sm text-gray-500 mt-1">{club.location}</div>
                  </div>
                  <div className="flex gap-2">
                    {isCreator(club) && (
                      <>
                        <button onClick={() => handleEdit(club)} className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100">Edit</button>
                        <button onClick={() => handleDelete(club)} className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100">Delete</button>
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
      </div>
    </div>
  );
};

export default Clubs;
