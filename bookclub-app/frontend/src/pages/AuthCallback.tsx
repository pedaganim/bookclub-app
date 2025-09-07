import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { config } from '../config';

// Minimal stub page to handle Cognito Hosted UI redirect (Authorization Code Grant)
// Exchanges the authorization code for tokens using PKCE, stores them, and redirects home.

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
      const doExchange = async () => {
        try {
          const code_verifier = sessionStorage.getItem('pkce_code_verifier');
          if (!code_verifier) {
            throw new Error('Missing PKCE code_verifier. Please start sign-in again.');
          }
          // Exchange code for tokens
          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.cognito.userPoolClientId,
            code,
            redirect_uri: config.cognito.redirectSignIn,
            code_verifier,
          });
          const resp = await fetch(`https://${config.cognito.domain}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Token exchange failed: ${resp.status} ${text}`);
          }
          const tokens = await resp.json();
          const accessToken = tokens.access_token as string;
          const idToken = tokens.id_token as string;
          const refreshToken = tokens.refresh_token as string | undefined;
          // Fetch user info from Cognito
          const uresp = await fetch(`https://${config.cognito.domain}/oauth2/userInfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const profile = await uresp.json();

          // Persist tokens and user
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('idToken', idToken);
          localStorage.setItem('user', JSON.stringify({
            email: profile.email,
            name: profile.name || profile.given_name || profile.email,
            sub: profile.sub,
          }));

          setStatus('success');
          setMessage('Signed in successfully. Redirecting…');
          // Force a full reload so AuthProvider initializes with stored tokens before route guards run
          const timer = setTimeout(() => {
            window.location.replace('/');
          }, 400);
          return () => clearTimeout(timer);
        } catch (e: any) {
          console.error(e);
          setStatus('error');
          setMessage(e?.message || 'Authentication failed.');
        }
      };
      doExchange();
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
