import React, { useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import {
  XMarkIcon,
  EnvelopeIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Props {
  clubId: string;
  clubName: string;
  onClose: () => void;
}

type EmailInvite = { email: string; status: string; createdAt: string; invitedBy: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
}

const InviteByEmailModal: React.FC<Props> = ({ clubId, clubName, onClose }) => {
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inviteText, setInviteText] = useState('');
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<EmailInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  useEffect(() => {
    apiService.listClubInvites(clubId)
      .then(res => setPendingInvites((res.items || []).filter((i: EmailInvite) => i.status === 'pending')))
      .catch(() => {})
      .finally(() => setInvitesLoading(false));
  }, [clubId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
      const parsed = parseEmails(ev.target?.result as string);
      if (parsed.length) {
        setEmailChips(prev => Array.from(new Set([...prev, ...parsed])));
        addNotification('success', `Loaded ${parsed.length} email${parsed.length !== 1 ? 's' : ''} from file`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeChip = (email: string) => setEmailChips(prev => prev.filter(e => e !== email));

  const handleSend = async () => {
    flushEmailText();
    const toSend = emailChips.length ? emailChips : parseEmails(inviteText);
    if (!toSend.length) return;
    try {
      setInviting(true);
      const res = await apiService.inviteClubMembers(clubId, toSend);
      addNotification('success', `${res.invited} invite${res.invited !== 1 ? 's' : ''} sent`);
      if (res.invalid?.length) addNotification('error', `Skipped invalid: ${res.invalid.join(', ')}`);
      setEmailChips([]);
      setInviteText('');
      // Refresh pending list
      const updated = await apiService.listClubInvites(clubId);
      setPendingInvites((updated.items || []).filter((i: EmailInvite) => i.status === 'pending'));
    } catch (e: any) {
      addNotification('error', e?.message || 'Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (email: string) => {
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

  const canSend = emailChips.length > 0 || inviteText.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-indigo-500" />
              Invite Members by Email
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{clubName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-xs text-gray-500">
            Invited people will be automatically approved as members when they sign in.
            Paste emails separated by commas, newlines, or semicolons — or upload a CSV/TXT file.
          </p>

          {/* Input area */}
          <div className="flex gap-2">
            <textarea
              value={inviteText}
              onChange={e => setInviteText(e.target.value)}
              onBlur={flushEmailText}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flushEmailText(); } }}
              placeholder={'alice@example.com, bob@example.com\nor one per line…'}
              rows={3}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <div className="flex flex-col gap-2 justify-start">
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

          {/* Email chips */}
          {emailChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
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

          {/* Pending invites */}
          {(invitesLoading || pendingInvites.length > 0) && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Pending Invites {!invitesLoading && `(${pendingInvites.length})`}
              </h4>
              {invitesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
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
                          {new Date(invite.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRevoke(invite.email)}
                        disabled={revokingEmail === invite.email}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {revokingEmail === invite.email
                          ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                          : <TrashIcon className="h-3.5 w-3.5" />
                        }
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSend}
            disabled={inviting || !canSend}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {inviting
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <EnvelopeIcon className="h-4 w-4" />
            }
            {inviting ? 'Sending…' : `Send ${emailChips.length > 0 ? emailChips.length : ''} Invite${emailChips.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteByEmailModal;
