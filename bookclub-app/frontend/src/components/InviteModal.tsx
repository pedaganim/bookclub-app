import React, { useState, useEffect } from 'react';
import { BookClub } from '../types';
import { apiService } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface InviteModalProps {
  club: BookClub;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ club, onClose }) => {
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailInvite, setEmailInvite] = useState({ email: '', name: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    const loadInviteLink = async () => {
      try {
        setLoading(true);
        const data = await apiService.getClubInviteLink(club.clubId);
        setInviteUrl(data.inviteUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to load invite link');
      } finally {
        setLoading(false);
      }
    };
    loadInviteLink();
  }, [club.clubId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInvite.email) {
      setError('Email is required');
      return;
    }

    try {
      setSendingEmail(true);
      setError('');
      setEmailSuccess('');
      await apiService.sendClubInvite({
        clubId: club.clubId,
        email: emailInvite.email,
        name: emailInvite.name,
      });
      setEmailSuccess('Invite sent successfully!');
      setEmailInvite({ email: '', name: '' });
      setTimeout(() => setEmailSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Invite Members to {club.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Copy Link Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Share Invite Link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Share this link with anyone you want to invite to the club
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or send via email</span>
              </div>
            </div>

            {/* Email Invite Section */}
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="inviteEmail"
                  value={emailInvite.email}
                  onChange={(e) => setEmailInvite({ ...emailInvite, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="inviteName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="inviteName"
                  value={emailInvite.name}
                  onChange={(e) => setEmailInvite({ ...emailInvite, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Friend's name"
                />
              </div>
              <button
                type="submit"
                disabled={sendingEmail}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? 'Sending...' : 'Send Invite'}
              </button>
            </form>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            {emailSuccess && (
              <div className="text-green-600 text-sm">{emailSuccess}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteModal;
