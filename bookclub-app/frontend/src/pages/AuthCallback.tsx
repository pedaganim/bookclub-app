import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Minimal stub page to handle Cognito Hosted UI redirect (Authorization Code Grant)
// For now, we just parse the `code` from the query string and show a friendly message.
// You can extend this to exchange the code for tokens via your backend if needed.

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Authentication error: ${error}`);
      return;
    }

    if (code) {
      // Store code temporarily (demo). Replace with a real token exchange flow.
      localStorage.setItem('oauth_code', code);
      setStatus('success');
      setMessage('Signed in with Google successfully.');

      // Redirect to home after a short delay
      const timer = setTimeout(() => navigate('/'), 1200);
      return () => clearTimeout(timer);
    } else {
      setStatus('error');
      setMessage('Missing authorization code in callback URL.');
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-2xl font-semibold">Authenticating…</h2>
        <p className={status === 'error' ? 'text-red-600' : 'text-gray-700'}>{message || 'Processing your sign-in…'}</p>
        {status === 'error' && (
          <button
            onClick={() => navigate('/login')}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
