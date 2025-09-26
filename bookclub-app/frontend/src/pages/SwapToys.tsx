import React, { useState } from 'react';
import { apiService } from '../services/api';

const SwapToys: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const handleRegisterInterest = async () => {
    try {
      setStatus('loading');
      setMessage('');
      const trimmed = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmed || !emailRegex.test(trimmed)) {
        setStatus('error');
        setEmailError('Please enter a valid email address');
        setMessage('');
        return;
      }

      await apiService.request<any>('/interest/swap-toys', {
        method: 'POST',
        body: JSON.stringify({ from: window.location.href, email: trimmed }),
      });
      setStatus('success');
      setMessage('Thanks! Your interest is registered. We\'ll notify you when it\'s ready.');
      setEmail('');
      setEmailError('');
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Failed to register your interest. Please try again.');
    }
  };

  const shareUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/swap-toys';
  const shareText = 'Help unlock Swap Toys on BookClub! If we reach 100 interested users, we\'ll launch it.';

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Swap Toys — BookClub', text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setMessage('Share text copied to clipboard!');
      }
    } catch (_) {
      // ignore user cancel
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Swap Toys (Coming soon)</h1>
        <p className="mt-3 text-gray-700">
          Register your interest in Swap Toys. If we reach 100 users, we\'ll make it live!
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <div className="sm:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="you@example.com"
              className={`mt-1 block w-full rounded-md border ${emailError ? 'border-red-300' : 'border-gray-300'} px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
            <p className="mt-1 text-xs text-gray-500">We\'ll only use this to notify you when Swap Toys is ready.</p>
          </div>
          <button
            onClick={handleRegisterInterest}
            disabled={status === 'loading'}
            className="h-11 sm:h-auto inline-flex items-center justify-center px-5 py-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {status === 'loading' ? 'Registering…' : 'Register Interest'}
          </button>
          <div className="sm:col-span-3">
            <button
              onClick={handleShare}
              className="mt-1 inline-flex items-center justify-center px-5 py-3 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            >
              Share this link
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-md p-4 ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Why Swap Toys?</h2>
          <ul className="mt-3 list-disc list-inside text-gray-700 space-y-1">
            <li>Give toys a second life and reduce waste</li>
            <li>Save money and discover new favourites</li>
            <li>Swap safely within your local community</li>
          </ul>
        </div>

        <div className="mt-8">
          <p className="text-gray-700">Share this with your friends:</p>
          <code className="block mt-2 bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 break-all">{shareUrl}</code>
        </div>
      </div>
    </div>
  );
};

export default SwapToys;
