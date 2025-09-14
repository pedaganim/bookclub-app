import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { User } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [profile, setProfile] = useState<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const u = await apiService.getUserPublic(userId);
        if (!mounted) return;
        setProfile(u);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.message || 'Failed to load user');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const startConversation = async () => {
    if (!profile) return;
    setStarting(true);
    try {
      const conv = await apiService.dmCreateConversation(profile.userId);
      addNotification('success', `Starting chat with ${profile.name}…`);
      navigate(`/messages/${conv.conversationId}`);
    } catch (e: any) {
      addNotification('error', e.message || 'Could not start conversation');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile…</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'User not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt={profile.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-600">
                {(profile.name || 'U').slice(0,1)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{profile.name}</h1>
              {profile.email && (
                <div className="text-sm text-gray-500">{profile.email}</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={startConversation}
              disabled={starting}
              className={`px-4 py-2 rounded-md text-white ${starting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {starting ? 'Starting…' : 'Start Conversation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
