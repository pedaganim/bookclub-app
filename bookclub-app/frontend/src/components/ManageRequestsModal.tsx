import React, { useCallback, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ManageRequestsModalProps {
  clubId: string;
  onClose: () => void;
}

interface PendingRequest {
  clubId: string;
  userId: string;
  status: string;
  requestedAt?: string;
}

const ManageRequestsModal: React.FC<ManageRequestsModalProps> = ({ clubId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<PendingRequest[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.listJoinRequests(clubId);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId: string) => {
    try {
      setActioning(userId);
      await apiService.approveJoinRequest(clubId, userId);
      setItems(prev => prev.filter(i => i.userId !== userId));
    } catch (e: any) {
      setError(e.message || 'Failed to approve');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActioning(userId);
      await apiService.rejectJoinRequest(clubId, userId);
      setItems(prev => prev.filter(i => i.userId !== userId));
    } catch (e: any) {
      setError(e.message || 'Failed to reject');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Join Requests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {error && (
          <div className="mb-3 rounded bg-red-50 text-red-700 text-sm p-2">{error}</div>
        )}
        {loading ? (
          <div className="py-6 text-center text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-gray-600">No pending requests.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((req) => (
              <li key={req.userId} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">User {req.userId.slice(-6)}</div>
                  <div className="text-xs text-gray-500">Requested {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.userId)}
                    disabled={actioning === req.userId}
                    className={`px-3 py-1 text-sm rounded-md text-white ${actioning === req.userId ? 'bg-green-300' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.userId)}
                    disabled={actioning === req.userId}
                    className={`px-3 py-1 text-sm rounded-md text-white ${actioning === req.userId ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManageRequestsModal;
