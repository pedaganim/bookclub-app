import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User } from '../types';

interface UserPickerModalProps {
  onClose: () => void;
  onPick: (user: Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'>) => void;
}

const UserPickerModal: React.FC<UserPickerModalProps> = ({ onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setError('');
    setResult(null);
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      if (q.includes('@')) {
        // Search by email
        const user = await apiService.findUserByEmail(q);
        if (user) setResult(user);
        else setError('No user found with that email');
      } else {
        // Treat as userId
        try {
          const user = await apiService.getUserPublic(q);
          setResult(user);
        } catch (e: any) {
          setError(e.message || 'No user found with that ID');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Start a Conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">✕</button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter email or user ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200">Cancel</button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {result && (
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
              <div className="flex items-center gap-3">
                {result.profilePicture ? (
                  <img src={result.profilePicture} alt={result.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                    {(result.name || 'U').slice(0,1)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">{result.name}</div>
                  <div className="text-xs text-gray-500">{result.email}</div>
                </div>
              </div>
              <button
                onClick={() => onPick(result)}
                className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Start Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPickerModal;
