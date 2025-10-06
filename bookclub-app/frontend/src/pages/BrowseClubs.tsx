import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { NavLink } from 'react-router-dom';
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
  const { isAuthenticated } = useAuth();
  const [userClubIds, setUserClubIds] = useState<Set<string>>(new Set());
  const { addNotification } = useNotification();

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
          return;
        }
        const res = await apiService.getUserClubs();
        const ids = new Set<string>((res.items || []).map((c: BookClub) => c.clubId));
        setUserClubIds(ids);
      } catch {
        setUserClubIds(new Set());
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
      const res = await apiService.requestClubJoin(club.clubId);
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

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex justify-center py-12 text-gray-600">Loading…</div>
      );
    }
    if (error) {
      return (
        <div className="rounded bg-red-50 text-red-700 p-3">{error}</div>
      );
    }
    if (!clubs || clubs.length === 0) {
      return (
        <div className="py-8 text-gray-600">No clubs found.</div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((club) => (
          <div key={club.clubId} className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                  {club.isPrivate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">Private</span>
                  )}
                  {userClubIds.has(club.clubId) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Member</span>
                  )}
                </div>
                {club.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{club.description}</p>
                )}
                <div className="text-xs text-gray-500 mt-1">{club.location}</div>
              </div>
            </div>
            <div className="mt-4">
              {!userClubIds.has(club.clubId) && (
                requestedClubIds.has(club.clubId) ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Request Sent
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequestJoin(club)}
                    disabled={requestingId === club.clubId}
                    className={`px-3 py-2 text-sm rounded-md text-white ${requestingId === club.clubId ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {club.isPrivate ? 'Request to Join' : 'Request to Join'}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [loading, error, clubs, requestingId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        </div>
        {/* Secondary tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <NavLink
              to="/clubs"
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
              end
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

        <SearchBar onSearch={onSearch} placeholder="Search clubs by name, description, location…" className="mb-4" />

        {content}

        <div className="mt-6">
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
      </div>
    </div>
  );
};

export default BrowseClubs;
