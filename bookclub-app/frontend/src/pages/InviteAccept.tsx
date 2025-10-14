import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const InviteAccept: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubName, setClubName] = useState('');

  useEffect(() => {
    // Store invite code for use after login if user is not authenticated
    if (inviteCode && !user) {
      sessionStorage.setItem('pendingInviteCode', inviteCode);
    }
  }, [inviteCode, user]);

  const handleJoinClub = async () => {
    if (!inviteCode) {
      setError('Invalid invite code');
      return;
    }

    if (!user) {
      // Redirect to login
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const club = await apiService.joinClub(inviteCode);
      setClubName(club.name);
      setTimeout(() => {
        navigate('/clubs');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to join club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.svg" alt="Book Club" className="h-16 w-auto" />
          </div>

          {clubName ? (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">You've joined {clubName}. Redirecting...</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                You've been invited to join a book club!
              </h2>
              <p className="text-gray-600 mb-6">
                Click below to accept the invitation and start sharing books with your club.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleJoinClub}
                disabled={loading}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : user ? 'Accept Invitation' : 'Sign in to Accept'}
              </button>

              {!user && (
                <p className="mt-4 text-sm text-gray-500">
                  You'll need to sign in or create an account first
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
