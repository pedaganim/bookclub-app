import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ClubCard from '../components/ClubCard';
import CreateClubModal from '../components/CreateClubModal';
import { useAuth } from '../contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const PAGE_SIZE_DEFAULT = 12;

const BrowseClubs: React.FC = () => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [tokenStack, setTokenStack] = useState<string[]>([]); // to support Previous
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedClubIds, setRequestedClubIds] = useState<Set<string>>(new Set());
  const { isAuthenticated, user } = useAuth();
  const [userClubIds, setUserClubIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const load = useCallback(async (opts?: { search?: string; limit?: number; nextToken?: string }) => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.browseClubs({
        search: opts?.search ?? search,
        limit: opts?.limit ?? pageSize,
        nextToken: opts?.nextToken,
      });
      setClubs(res.items || []);
      setNextToken(res.nextToken);
    } catch (e: any) {
      setError(e.message || 'Failed to browse clubs');
    } finally {
      setLoading(false);
    }
  }, [search, pageSize]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageSize]);

  // Load current user's clubs to hide join option for existing memberships
  useEffect(() => {
    (async () => {
      try {
        if (!isAuthenticated) {
          setUserClubIds(new Set());
          setRequestedClubIds(new Set());
          return;
        }
        const res = await apiService.getUserClubs();
        const items = res.items || [];
        
        // Active members
        const activeIds = new Set<string>(
          items.filter((c: any) => (c?.userStatus || 'active') === 'active')
               .map((c: BookClub) => c.clubId)
        );
        setUserClubIds(activeIds);

        // Pending members (those who have already requested)
        const pendingIds = new Set<string>(
          items.filter((c: any) => c?.userStatus === 'pending')
               .map((c: BookClub) => c.clubId)
        );
        setRequestedClubIds(pendingIds);
      } catch {
        setUserClubIds(new Set());
        setRequestedClubIds(new Set());
      }
    })();
  }, [isAuthenticated]);

  const onSearch = (q: string) => {
    setTokenStack([]);
    setNextToken(undefined);
    setSearch(q);
  };

  const handleNext = async () => {
    if (!nextToken) return;
    setTokenStack(prev => [...prev, nextToken]);
    await load({ nextToken, search, limit: pageSize });
  };

  const handlePrevious = async () => {
    if (tokenStack.length === 0) return;
    const newStack = [...tokenStack];
    const prevToken = newStack.pop();
    setTokenStack(newStack);
    await load({ nextToken: prevToken, search, limit: pageSize });
  };

  const hasPrevious = tokenStack.length > 0;
  const hasNext = Boolean(nextToken);

  const handleRequestJoin = async (club: BookClub) => {
    try {
      setRequestingId(club.clubId);
      await apiService.requestClubJoin(club.clubId);
      // Optimistically mark as requested
      setRequestedClubIds((prev) => {
        const next = new Set(prev);
        next.add(club.clubId);
        return next;
      });
      addNotification('success', 'Request sent');
    } catch (e: any) {
      addNotification('error', e.message || 'Failed to request join');
    } finally {
      setRequestingId(null);
    }
  };

  const isCreatorOf = (club: BookClub) => !!(user?.userId && club.createdBy === user.userId);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-lg bg-red-50 text-red-700 p-4 border border-red-100">{error}</div>
      );
    }
    if (!clubs || clubs.length === 0) {
      return (
        <div className="py-12 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500">No clubs found matching your search.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <ClubCard
            key={club.clubId}
            club={club}
            isCreator={isCreatorOf(club)}
            isMember={userClubIds.has(club.clubId)}
            isRequested={requestedClubIds.has(club.clubId)}
            onJoin={() => handleRequestJoin(club)}
            isJoining={requestingId === club.clubId}
          />
        ))}
      </div>
    );
  }, [loading, error, clubs, requestingId, userClubIds, requestedClubIds, user?.userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your communities or discover new ones.</p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowCreate(true)} 
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Create Club
              </button>
            </div>
          )}
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

        <SearchBar 
          onSearch={onSearch} 
          placeholder="Search clubs by name, description, location…" 
          className="mb-8 shadow-sm" 
        />

        {content}

        <div className="mt-8">
          <Pagination
            pageSize={pageSize}
            onPageSizeChange={(size) => setPageSize(size)}
            hasNextPage={hasNext}
            hasPreviousPage={hasPrevious}
            onNextPage={handleNext}
            onPreviousPage={handlePrevious}
            currentItemsCount={clubs?.length || 0}
            isLoading={loading}
            itemLabelSingular="club"
            itemLabelPlural="clubs"
          />
        </div>

        {showCreate && (
          <CreateClubModal
            onClose={() => setShowCreate(false)}
            onClubCreated={(newClub) => {
              setShowCreate(false);
              addNotification('success', 'Club created successfully');
              load();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BrowseClubs;
