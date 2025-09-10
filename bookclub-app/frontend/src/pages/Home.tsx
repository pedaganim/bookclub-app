import React, { useState, useEffect, useCallback } from 'react';
import { Book, BookClub } from '../types';
import { apiService } from '../services/api';
import BookCard from '../components/BookCard';
import AddBookModal from '../components/AddBookModal';
import ClubCard from '../components/ClubCard';
import CreateClubModal from '../components/CreateClubModal';
import JoinClubModal from '../components/JoinClubModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  Squares2X2Icon, 
  ListBulletIcon, 
  UserGroupIcon,
  BookOpenIcon 
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [error, setError] = useState('');
  const [clubsError, setClubsError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showJoinClubModal, setShowJoinClubModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-books'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'books' | 'clubs'>('books');
  const { user } = useAuth();

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'my-books' && user ? { userId: user.userId } : {};
      const response = await apiService.listBooks(params);
      setBooks(Array.isArray((response as any)?.items) ? (response as any).items : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [filter, user]);

  const fetchClubs = useCallback(async () => {
    try {
      setClubsLoading(true);
      const response = await apiService.getUserClubs();
      setClubs(response.items || []);
    } catch (err: any) {
      setClubsError(err.message || 'Failed to fetch clubs');
    } finally {
      setClubsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchClubs();
  }, [fetchBooks, fetchClubs]);

  const handleBookAdded = (newBook: Book) => {
    setBooks([newBook, ...books]);
    setShowAddModal(false);
  };

  const handleBookDeleted = (bookId: string) => {
    setBooks(books.filter(book => book.bookId !== bookId));
  };

  const handleBookUpdated = (updatedBook: Book) => {
    setBooks(books.map(book => 
      book.bookId === updatedBook.bookId ? updatedBook : book
    ));
  };

  const handleClubCreated = (newClub: BookClub) => {
    setClubs([newClub, ...clubs]);
    setShowCreateClubModal(false);
  };

  const handleClubJoined = (newClub: BookClub) => {
    setClubs([newClub, ...clubs]);
    setShowJoinClubModal(false);
  };

  const handleClubLeft = async (clubId: string) => {
    try {
      await apiService.leaveClub(clubId);
      setClubs(clubs.filter(club => club.clubId !== clubId));
    } catch (err: any) {
      alert(err.message || 'Failed to leave club');
    }
  };

  const handleCopyInvite = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      alert('Invite code copied to clipboard!');
    }).catch(() => {
      alert(`Invite code: ${inviteCode}`);
    });
  };

  if (loading || clubsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BookClub</h1>
            <p className="mt-2 text-gray-600">
              Discover and share books with the community
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'books' ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Add Books
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowJoinClubModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Join Club
                </button>
                <button
                  onClick={() => setShowCreateClubModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Create Club
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('books')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'books'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpenIcon className="h-4 w-4" />
                Books
              </button>
              <button
                onClick={() => setActiveTab('clubs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'clubs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserGroupIcon className="h-4 w-4" />
                My Clubs ({clubs.length})
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'books' ? (
          <>
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-md font-medium ${
                      filter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Books
                  </button>
                  <button
                    onClick={() => setFilter('my-books')}
                    className={`px-4 py-2 rounded-md font-medium ${
                      filter === 'my-books'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    My Books
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md ${
                      viewMode === 'grid'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Grid View"
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${
                      viewMode === 'list'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {(!Array.isArray(books) || books?.length === 0) ? (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {filter === 'my-books' 
                    ? "You haven't added any books yet. Click 'Add Books' to get started!"
                    : "No books available. Be the first to add one!"
                  }
                </div>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
              }>
                {books.map((book) => (
                  <BookCard
                    key={book.bookId}
                    book={book}
                    onDelete={handleBookDeleted}
                    onUpdate={handleBookUpdated}
                    showActions={user?.userId === book.userId}
                    listView={viewMode === 'list'}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {clubsError && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{clubsError}</div>
              </div>
            )}

            {clubs.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500 mb-4">
                  You haven't joined any book clubs yet.
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowJoinClubModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                  >
                    Join a Club
                  </button>
                  <button
                    onClick={() => setShowCreateClubModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
                  >
                    Create a Club
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map((club) => (
                  <ClubCard
                    key={club.clubId}
                    club={club}
                    onLeave={handleClubLeft}
                    onCopyInvite={handleCopyInvite}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showAddModal && (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onBookAdded={handleBookAdded}
          />
        )}

        {showCreateClubModal && (
          <CreateClubModal
            onClose={() => setShowCreateClubModal(false)}
            onClubCreated={handleClubCreated}
          />
        )}

        {showJoinClubModal && (
          <JoinClubModal
            onClose={() => setShowJoinClubModal(false)}
            onClubJoined={handleClubJoined}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
