import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { getItemLabel, getItemLabelLower } from '../utils/labels';

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onBookUpdated: (book: Book) => void;
}

const EditBookModal: React.FC<EditBookModalProps> = ({ book, onClose, onBookUpdated }) => {
  const [formData, setFormData] = useState({
    title: book.title,
    author: book.author || '',
    description: book.description || '',
    status: book.status,
    lentToUserId: book.lentToUserId || '',
    lentToUserName: book.lentToUserName || '',
  });
  const [lentToEmail, setLentToEmail] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updatedBook = await apiService.updateBook(book.bookId, formData);
      onBookUpdated(updatedBook);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to update ${getItemLabelLower(book.category || 'book')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
      <div className="relative mx-auto p-8 border w-full max-w-md shadow-2xl rounded-[32px] bg-white transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase italic">
              Edit <span className="text-indigo-600">{getItemLabel(book.category || 'book')}</span>
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 p-4">
              <div className="text-sm font-bold text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
              <input
                type="text"
                required
                className="block w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                {book.category === 'book' || !book.category ? 'Author' : 'Brand / Manufacturer'}
              </label>
              <input
                type="text"
                className="block w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
              <textarea
                rows={3}
                className="block w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Status</label>
              <select
                className="block w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold appearance-none cursor-pointer"
                value={formData.status}
                onChange={(e) => {
                  const newStatus = e.target.value as any;
                  const updates: any = { status: newStatus };
                  if (newStatus !== 'borrowed') {
                    updates.lentToUserId = '';
                    updates.lentToUserName = '';
                  }
                  setFormData({ ...formData, ...updates });
                }}
              >
                <option value="available">Available</option>
                <option value="borrowed">Lent Out</option>
                <option value="reading">Currently Using</option>
                <option value="giving_away">Giving away / Selling</option>
              </select>
            </div>

            {formData.status === 'borrowed' && (
              <div className="bg-amber-50 p-5 rounded-3xl border border-amber-200 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-black uppercase tracking-widest text-amber-800 mb-3 ml-1">Lent to neighbor</label>
                
                {formData.lentToUserName ? (
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-amber-300 shadow-sm">
                    <span className="text-sm text-gray-900 font-bold">
                      {formData.lentToUserName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, lentToUserId: '', lentToUserName: '' })}
                      className="text-xs text-red-600 hover:text-red-800 font-black uppercase tracking-tight"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="neighbor@email.com"
                        className="flex-1 bg-white border border-amber-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={lentToEmail}
                        onChange={(e) => setLentToEmail(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={searchingUser || !lentToEmail}
                        onClick={async () => {
                          const normalizedEmail = lentToEmail.trim().toLowerCase();
                          if (!normalizedEmail) return;
                          setSearchingUser(true);
                          try {
                            const found = await apiService.findUserByEmail(normalizedEmail);
                            if (found) {
                              setFormData({
                                ...formData,
                                lentToUserId: found.userId,
                                lentToUserName: found.name
                              });
                              setLentToEmail('');
                            } else {
                              setError('No user found with that email. Ensure they have signed up.');
                            }
                          } catch (err: any) {
                            setError(err.message || 'Error searching for user');
                          } finally {
                            setSearchingUser(false);
                          }
                        }}
                        className="px-6 py-2.5 bg-amber-600 text-white text-xs font-black uppercase tracking-tight rounded-2xl hover:bg-amber-700 disabled:opacity-50"
                      >
                        {searchingUser ? '...' : 'Find'}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-700/80 italic ml-1">
                      Search for a neighbor by their email to track this transfer.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBookModal;
