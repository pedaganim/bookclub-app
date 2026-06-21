import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { BookClub } from '../types';
import { 
  ShieldCheckIcon, 
  ChevronLeftIcon,
  EnvelopeIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import ClubMembersSection from '../components/ClubMembersSection';

type EmailInvite = { email: string; status: string; createdAt: string; invitedBy: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
}

const ClubMembers: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<BookClub | null>(null);
  const { addNotification } = useNotification();

  // Invite panel state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<EmailInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useMemo(() => {
    return club?.userRole === 'admin' || club?.createdBy === user?.userId;
  }, [club, user]);

  const loadData = async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      const clubRes = await apiService.getClub(clubId);
      setClub(clubRes);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = useCallback(async () => {
    if (!clubId || !isAdmin) return;
    try {
      setInvitesLoading(true);
      const res = await apiService.listClubInvites(clubId);
      setPendingInvites((res.items || []).filter((i: EmailInvite) => i.status === 'pending'));
    } catch {
      // non-critical
    } finally {
      setInvitesLoading(false);
    }
  }, [clubId, isAdmin]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (isAdmin) loadInvites();
  }, [isAdmin, loadInvites]);

  const flushEmailText = () => {
    if (!inviteText.trim()) return;
    const parsed = parseEmails(inviteText);
    if (parsed.length) {
      setEmailChips(prev => Array.from(new Set([...prev, ...parsed])));
      setInviteText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseEmails(text);
      if (parsed.length) {
        setEmailChips(prev => Array.from(new Set([...prev, ...parsed])));
        addNotification('success', `Loaded ${parsed.length} email${parsed.length !== 1 ? 's' : ''} from file`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeChip = (email: string) => setEmailChips(prev => prev.filter(e => e !== email));

  const handleSendInvites = async () => {
    flushEmailText();
    const toSend = emailChips.length ? emailChips : parseEmails(inviteText);
    if (!toSend.length || !clubId) return;
    try {
      setInviting(true);
      const res = await apiService.inviteClubMembers(clubId, toSend);
      addNotification('success', `${res.invited} invite${res.invited !== 1 ? 's' : ''} sent`);
      if (res.invalid?.length) {
        addNotification('error', `Skipped invalid: ${res.invalid.join(', ')}`);
      }
      setEmailChips([]);
      setInviteText('');
      loadInvites();
    } catch (e: any) {
      addNotification('error', e?.message || 'Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (email: string) => {
    if (!clubId) return;
    try {
      setRevokingEmail(email);
      await apiService.revokeClubInvite(clubId, email);
      setPendingInvites(prev => prev.filter(i => i.email !== email));
      addNotification('success', 'Invite revoked');
    } catch (e: any) {
      addNotification('error', e?.message || 'Failed to revoke invite');
    } finally {
      setRevokingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        <p className="mt-4 text-gray-500 font-medium">Loading audit data…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Member Audit</h1>
                <p className="text-sm text-gray-500 line-clamp-1">{club?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin && (
          <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Admin Panel:</span> You can audit all members and remove users if necessary. Removal is permanent but they can request to join again.
            </p>
          </div>
        )}

        {/* Invite by Email panel */}
        {isAdmin && (
          <div className="mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setInviteOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <EnvelopeIcon className="h-5 w-5 text-indigo-500" />
                Invite Members by Email
                {pendingInvites.length > 0 && (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    {pendingInvites.length} pending
                  </span>
                )}
              </div>
              {inviteOpen ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
            </button>

            {inviteOpen && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mt-3 mb-3">
                  When an invited person signs in, they'll automatically be approved as a member.
                  Paste emails separated by commas, newlines, or semicolons — or upload a CSV/TXT file.
                </p>

                {/* Textarea + file upload */}
                <div className="flex gap-2 mb-3">
                  <textarea
                    value={inviteText}
                    onChange={e => setInviteText(e.target.value)}
                    onBlur={flushEmailText}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flushEmailText(); } }}
                    placeholder="alice@example.com, bob@example.com\nor one per line…"
                    rows={3}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                      title="Upload CSV or TXT"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      Upload
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>

                {/* Email chips preview */}
                {emailChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {emailChips.map(email => {
                      const valid = EMAIL_RE.test(email);
                      return (
                        <span
                          key={email}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            valid ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {email}
                          <button onClick={() => removeChip(email)} className="ml-0.5 hover:opacity-70">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleSendInvites}
                  disabled={inviting || (emailChips.length === 0 && !inviteText.trim())}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {inviting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <EnvelopeIcon className="h-4 w-4" />
                  )}
                  {inviting ? 'Sending…' : `Send ${emailChips.length || ''} Invite${emailChips.length !== 1 ? 's' : ''}`}
                </button>

                {/* Pending invites list */}
                {(invitesLoading || pendingInvites.length > 0) && (
                  <div className="mt-5">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pending Invites</h4>
                    {invitesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
                        Loading…
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                        {pendingInvites.map(invite => (
                          <li key={invite.email} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{invite.email}</span>
                              <span className="ml-2 text-xs text-gray-400">
                                Invited {new Date(invite.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRevokeInvite(invite.email)}
                              disabled={revokingEmail === invite.email}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {revokingEmail === invite.email ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                              ) : (
                                <TrashIcon className="h-3.5 w-3.5" />
                              )}
                              Revoke
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {clubId && (
          <ClubMembersSection 
            clubId={clubId} 
            isAdmin={isAdmin} 
            createdBy={club?.createdBy} 
          />
        )}
      </div>
    </div>
  );
};

export default ClubMembers;
