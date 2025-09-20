import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Book } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const EditBook: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'available' | 'reading' | 'borrowed'>('available');
  const [lentEmail, setLentEmail] = useState('');
  const [lentLookupLoading, setLentLookupLoading] = useState(false);
  const [lentUser, setLentUser] = useState<{ userId: string; name?: string; email?: string } | null>(null);
  const [lentOptions, setLentOptions] = useState<Array<{ userId: string; name?: string; email?: string }>>([]);
  const [lentSearchTimer, setLentSearchTimer] = useState<number | null>(null);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  useEffect(() => {
    (async () => {
      try {
        if (!bookId) return;
        setLoading(true);
        const b = await apiService.getBook(bookId);
        setBook(b);
        setTitle(b.title || '');
        setAuthor(b.author || '');
        setDescription((b as any).description || '');
        setStatus((b as any).status || 'available');
      } catch (e: any) {
        setError(e?.message || 'Failed to load book');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;
    try {
      setSaving(true);
      // If Lent selected, enforce recipient
      if (status === 'borrowed' && !lentUser?.userId) {
        setError('Please select who you lent the book to.');
        setSaving(false);
        return;
      }
      const payload: any = { title, author, description, status };
      if (status === 'borrowed' && lentUser?.userId) {
        payload.lentToUserId = lentUser.userId;
        payload.lentToUserName = lentUser.name || undefined;
      } else {
        // If not lent, clear lent fields
        payload.lentToUserId = null;
        payload.lentToUserName = null;
      }
      const updated = await apiService.updateBook(bookId, payload);
      addNotification('success', 'Book updated');
      navigate(`/books/${updated.bookId}`);
    } catch (e: any) {
      addNotification('error', e?.message || 'Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-4">{error}</div>
        <Link to="/library" className="text-indigo-600 hover:text-indigo-800 hover:underline">Back to Library</Link>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6">
          <Link to={`/books/${book.bookId}`} className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm">← Back to Book</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Edit Book</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={status}
                onChange={(e) => {
                  const val = e.target.value as 'available' | 'reading' | 'borrowed';
                  setStatus(val);
                  if (val !== 'borrowed') {
                    setLentUser(null);
                    setLentEmail('');
                  }
                }}
              >
                <option value="available">Available</option>
                <option value="reading">Reading</option>
                <option value="borrowed">Lent</option>
              </select>
              {status === 'borrowed' && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-gray-600">Select who you lent it to (by email)</div>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="friend@example.com"
                      value={lentEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLentEmail(val);
                        setLentUser(null);
                        setError('');
                        // Debounce search by email
                        if (lentSearchTimer) window.clearTimeout(lentSearchTimer);
                        const timer = window.setTimeout(async () => {
                          if (!val || !val.includes('@') || val.length < 5) { setLentOptions([]); return; }
                          setLentLookupLoading(true);
                          try {
                            const found = await apiService.findUserByEmail(val.trim());
                            if (found && (found as any).userId) {
                              setLentOptions([{ userId: (found as any).userId, name: (found as any).name, email: (found as any).email }]);
                            } else {
                              setLentOptions([]);
                            }
                          } catch (_) {
                            setLentOptions([]);
                          } finally {
                            setLentLookupLoading(false);
                          }
                        }, 300);
                        setLentSearchTimer(timer as unknown as number);
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {/* Dropdown results */}
                    {lentOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow">
                        {lentOptions.map((opt) => (
                          <button
                            type="button"
                            key={opt.userId}
                            onClick={() => {
                              setLentUser(opt);
                              setLentEmail(opt.email || '');
                              setLentOptions([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <div className="font-medium text-gray-900">{opt.name || opt.email || opt.userId}</div>
                            {opt.email && <div className="text-xs text-gray-500">{opt.email}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                    {lentLookupLoading && (
                      <div className="absolute right-2 top-2 text-xs text-gray-500">Searching…</div>
                    )}
                  </div>
                  {lentUser && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 inline-block mt-2">
                      Selected: {lentUser.name || lentUser.email || lentUser.userId}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Link to={`/books/${book.bookId}`} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </Link>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBook;
