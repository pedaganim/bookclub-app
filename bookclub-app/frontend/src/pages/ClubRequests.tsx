import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

type PendingRequest = { clubId: string; userId: string; status: string; requestedAt?: string; name?: string; email?: string };

const ClubRequests: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [items, setItems] = useState<PendingRequest[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const load = async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiService.listJoinRequests(clubId);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const handleApprove = async (userId: string) => {
    if (!clubId) return;
    try {
      setActing(userId);
      await apiService.approveJoinRequest(clubId, userId);
      addNotification?.('success', 'Request approved');
      await load();
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to approve request');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!clubId) return;
    try {
      setActing(userId);
      await apiService.rejectJoinRequest(clubId, userId);
      addNotification?.('success', 'Request rejected');
      await load();
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to reject request');
    } finally {
      setActing(null);
    }
  };

  const content = useMemo(() => {
    if (loading) return <div className="py-10 text-gray-600">Loading…</div>;
    if (error) return <div className="rounded bg-red-50 text-red-700 p-3">{error}</div>;
    if (!items.length) return <div className="py-10 text-gray-600">No pending requests.</div>;
    return (
      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.userId} className="flex items-center justify-between bg-white rounded border p-3">
            <div>
              <div className="text-sm font-medium text-gray-900">{r.name || r.userId}</div>
              <div className="text-xs text-gray-500">{r.email || ''}</div>
              {r.requestedAt && (
                <div className="text-xs text-gray-400">Requested: {new Date(r.requestedAt).toLocaleString()}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(r.userId)}
                disabled={acting === r.userId}
                className={`px-3 py-1 text-sm rounded-md text-white ${acting === r.userId ? 'bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                aria-label={`Approve ${r.userId}`}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(r.userId)}
                disabled={acting === r.userId}
                className={`px-3 py-1 text-sm rounded-md text-white ${acting === r.userId ? 'bg-rose-300' : 'bg-rose-600 hover:bg-rose-700'}`}
                aria-label={`Reject ${r.userId}`}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }, [items, loading, error, acting]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Requests</h1>
        {content}
      </div>
    </div>
  );
};

export default ClubRequests;
