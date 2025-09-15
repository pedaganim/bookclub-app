import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const DEFAULTS: Record<string, boolean> = {
  new_book_from_followed_user: true,
  comment_on_your_book: true,
  reminder_due_date: true,
  new_member_in_your_club: true,
  club_announcement: true,
  dm_message_received: true,
};

const NotificationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ ...DEFAULTS });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getNotificationPrefs();
      setEmailOptIn(res.emailOptIn);
      setPrefs({ ...DEFAULTS, ...(res.prefs || {}) });
    } catch (e: any) {
      setError(e.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await apiService.updateNotificationPrefs({ emailOptIn, prefs });
    } catch (e: any) {
      setError(e.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const entries = [
    { key: 'dm_message_received', label: 'Email me when I receive a direct message' },
    { key: 'new_book_from_followed_user', label: 'New book added by someone I follow' },
    { key: 'comment_on_your_book', label: 'Comments on my book' },
    { key: 'reminder_due_date', label: 'Reminders (due dates, follow-ups)' },
    { key: 'new_member_in_your_club', label: 'New member joins my club' },
    { key: 'club_announcement', label: 'Club announcements' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Email Notifications</h1>
        <p className="text-gray-600 mb-6">Choose which email notifications you want to receive. You can change these at any time.</p>

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-900 font-medium">Receive email notifications</div>
                <div className="text-gray-500 text-sm">Master switch for all email notifications</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                />
                <span className={`w-11 h-6 flex items-center bg-${emailOptIn ? 'indigo-600' : 'gray-300'} rounded-full p-1 transition-colors`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${emailOptIn ? 'translate-x-5' : ''}`}></span>
                </span>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              {entries.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="text-gray-800">{label}</div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={!!prefs[key]}
                      onChange={() => handleToggle(key)}
                      disabled={!emailOptIn}
                    />
                    <span className={`w-11 h-6 flex items-center bg-${emailOptIn ? (prefs[key] ? 'indigo-600' : 'gray-300') : 'gray-200'} rounded-full p-1 transition-colors`}>
                      <span className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${emailOptIn && prefs[key] ? 'translate-x-5' : ''}`}></span>
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded-md text-white ${saving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
