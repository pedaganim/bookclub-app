import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import SEO from '../components/SEO';

type FormType = 'feedback' | 'feature_request' | 'bug_report' | 'general';

const TYPE_OPTIONS: { value: FormType; label: string; description: string }[] = [
  { value: 'feedback', label: 'Feedback', description: 'Share what you think about the app' },
  { value: 'feature_request', label: 'Feature Request', description: 'Suggest something new' },
  { value: 'bug_report', label: 'Bug Report', description: 'Let us know something is broken' },
  { value: 'general', label: 'General Inquiry', description: 'Anything else on your mind' },
];

const ContactPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotification();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [type, setType] = useState<FormType>('feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.submitContact({ name: name.trim(), email: email.trim(), type, message: message.trim() });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setError(msg);
      addNotification?.('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <SEO title="Contact Us — BookClub" description="Get in touch with the BookClub team" />
        <div className="max-w-md w-full text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h1>
          <p className="text-gray-600 mb-6">Thanks for reaching out. We'll get back to you as soon as we can.</p>
          <button
            onClick={() => { setSubmitted(false); setMessage(''); setType('feedback'); }}
            className="text-indigo-600 font-semibold hover:text-indigo-700 underline"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Contact Us — BookClub" description="Get in touch with the BookClub team" />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
              <p className="text-sm text-gray-500">We'd love to hear from you</p>
            </div>
          </div>
          <p className="text-gray-600 max-w-xl">
            Have feedback, a feature idea, or spotted a bug? Drop us a message and we'll get back to you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">

            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">What's this about?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      type === opt.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${type === opt.value ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name + Email row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="contact-message" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Tell us what's on your mind…"
                required
                maxLength={5000}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm resize-none"
              />
              <div className="text-xs text-gray-400 text-right mt-1">{message.length}/5000</div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {isAuthenticated && (
                <p className="text-xs text-gray-400">Signed in as {user?.name || user?.email}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={`ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all shadow-sm ${
                  submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending…
                  </>
                ) : (
                  <>
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
