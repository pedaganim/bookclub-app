import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

export type PendingRequest = { 
  clubId: string; 
  userId: string; 
  status: string; 
  requestedAt?: string; 
  name?: string; 
  email?: string 
};

interface ClubJoinRequestsProps {
  clubId: string;
  onStatusChange?: () => void;
  className?: string;
  variant?: 'full' | 'compact';
}

const ClubJoinRequests: React.FC<ClubJoinRequestsProps> = ({ 
  clubId, 
  onStatusChange, 
  className = '',
  variant = 'full'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [items, setItems] = useState<PendingRequest[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const load = useCallback(async () => {
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
  }, [clubId]);

  useEffect(() => { 
    load(); 
  }, [load]);

  const handleApprove = async (userId: string) => {
    if (!clubId) return;
    try {
      setActing(userId);
      await apiService.approveJoinRequest(clubId, userId);
      addNotification?.('success', 'Request approved');
      setItems(prev => prev.filter(r => r.userId !== userId));
      onStatusChange?.();
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
      setItems(prev => prev.filter(r => r.userId !== userId));
      onStatusChange?.();
    } catch (e: any) {
      addNotification?.('error', e?.message || 'Failed to reject request');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="py-4 text-gray-500 text-sm">Loading requests...</div>;
  if (error) return <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm border border-red-100">{error}</div>;
  if (!items.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((r) => (
        <div 
          key={r.userId} 
          className={`flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${variant === 'compact' ? 'py-3' : ''}`}
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">
              {r.name || r.email || `User ${r.userId.slice(-6)}`}
            </div>
            <div className="text-xs text-gray-500 truncate">{r.email || 'No email provided'}</div>
            {r.requestedAt && variant === 'full' && (
              <div className="text-[10px] text-gray-400 mt-1">
                Requested: {new Date(r.requestedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleApprove(r.userId)}
              disabled={acting === r.userId}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="Approve"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => handleReject(r.userId)}
              disabled={acting === r.userId}
              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
              title="Reject"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClubJoinRequests;
