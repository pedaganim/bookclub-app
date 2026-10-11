import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { BookClub } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import SEO from '../components/SEO';
import { 
  UserGroupIcon, 
  MapPinIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const ClubJoinQr: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  const [club, setClub] = useState<BookClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClubDetails = async () => {
      if (!clubId) {
        setError('Invalid club URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        // Fetch club details. Note: If not authenticated, we can't call this
        // because the backend endpoint requires auth. We'll handle that branch.
        if (isAuthenticated) {
          const res = await apiService.getClub(clubId);
          setClub(res);
        }
      } catch (err: any) {
        console.error('Failed to load club details:', err);
        if (err.response?.status === 404) {
          setError('The requested club could not be found.');
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          // If auth issue, let's treat it as need to sign in
          setError('');
        } else {
          setError(err.message || 'Failed to load club information');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchClubDetails();
    }
  }, [clubId, isAuthenticated, authLoading]);

  const handleSignInToJoin = () => {
    if (!clubId) return;
    try {
      localStorage.setItem('pendingClubJoin', clubId);
      addNotification('info', 'Redirecting to login. Your join request will be sent automatically after signing in.');
      navigate('/login');
    } catch (_) {
      navigate('/login');
    }
  };

  const handleRequestJoin = async () => {
    if (!clubId) return;
    try {
      setSubmitting(true);
      const res = await apiService.requestClubJoin(clubId);
      
      // Update state to match request status
      setClub(prev => prev ? { 
        ...prev, 
        userStatus: res.status as 'pending' | 'active',
        isMember: res.status === 'active'
      } : prev);

      if (res.status === 'active') {
        addNotification('success', `Welcome! You are now a member of ${club?.name}`);
      } else {
        addNotification('success', 'Join request submitted! The club admin has been notified.');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to request to join club');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-red-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ExclamationCircleIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-950 mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/library')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/10"
          >
            Go to Library Hub
          </button>
        </div>
      </div>
    );
  }

  const isMember = club && (club.isMember || club.userRole === 'admin' || club.userRole === 'member' || club.userStatus === 'active');
  const isPending = club && club.userStatus === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title={club ? `Join ${club.name}` : 'Join Book Club'}
        description="Scan code to send a join request and join this community book club."
      />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img 
            src="/townwink-logo.png" 
            alt="TownWink" 
            className="h-16 w-auto sm:h-20"
          />
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-indigo-50/50 shadow-2xl flex flex-col">
          
          {/* Main Welcome Message */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-150 text-indigo-700 uppercase tracking-widest mb-3">
              Book Club Invitation
            </span>
            <h2 className="text-3xl font-black text-indigo-950 leading-tight">
              {club ? club.name : 'Join Our Club'}
            </h2>
            {club?.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                {club.description}
              </p>
            )}
          </div>

          {/* Club Info Strip (only when authenticated & club loaded) */}
          {isAuthenticated && club && (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex items-center gap-2.5 text-xs text-indigo-900 font-semibold">
                <MapPinIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span>Location: <span className="text-gray-700">{club.location}</span></span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-indigo-900 font-semibold">
                <UserGroupIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span>Members: <span className="text-gray-700">{club.memberCount || 0} active</span></span>
              </div>
            </div>
          )}

          {/* Action Box */}
          <div className="border-t border-gray-100 pt-6 mt-2 flex-1 flex flex-col justify-center">
            
            {/* Case A: Not Authenticated */}
            {!isAuthenticated && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-6">
                  You have been invited to join this library club. Please sign in to request membership access.
                </p>
                <button
                  onClick={handleSignInToJoin}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/10"
                >
                  Sign In with Google to Join
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Case B: Authenticated & Already Member */}
            {isAuthenticated && isMember && club && (
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircleIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Already a Member</h3>
                <p className="text-sm text-gray-500 mb-6">
                  You are already an active member of <strong>{club.name}</strong>. Enjoy exploring books, toys, and other shared items!
                </p>
                <button
                  onClick={() => navigate(`/neighbourhoods/${club.slug || club.clubId}/explore`)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/10"
                >
                  Explore Neighbourhood Library
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Case C: Authenticated & Request Pending */}
            {isAuthenticated && isPending && club && (
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <ClockIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Request Pending</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Your request to join <strong>{club.name}</strong> is currently pending administrator review.
                </p>
                <p className="text-xs text-gray-400 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  The admin has been notified and you will receive access as soon as your request is approved.
                </p>
                <button
                  onClick={() => navigate('/library')}
                  className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold text-sm transition-all"
                >
                  Back to Library Hub
                </button>
              </div>
            )}

            {/* Case D: Authenticated & No Membership Record */}
            {isAuthenticated && !isMember && !isPending && club && (
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <LockClosedIcon className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Join requests must be reviewed and approved by the club administrator before you can view available books and shared items.
                </p>
                <button
                  onClick={handleRequestJoin}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                >
                  {submitting ? 'Submitting Request...' : 'Send Request to Join'}
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default ClubJoinQr;
