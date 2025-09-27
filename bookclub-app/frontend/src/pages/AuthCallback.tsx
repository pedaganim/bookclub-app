import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { config } from '../config';

// Minimal stub page to handle Cognito Hosted UI redirect (Authorization Code Grant)
// Exchanges the authorization code for tokens using PKCE, stores them, and redirects home.

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [authCode, setAuthCode] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const doExchange = useCallback(async (code: string) => {
    try {
      // Primary: sessionStorage (typical desktop flow)
      let code_verifier = sessionStorage.getItem('pkce_code_verifier');
      // Mobile fallback: some browsers lose sessionStorage across redirects; try localStorage
      if (!code_verifier) {
        try {
          const lsVerifier = localStorage.getItem('pkce_code_verifier');
          const ts = Number(localStorage.getItem('pkce_code_verifier_ts') || '0');
          const FRESH_MS = 10 * 60 * 1000; // 10 minutes
          if (lsVerifier && ts && Date.now() - ts < FRESH_MS) {
            code_verifier = lsVerifier;
            // Move it back to session for consistency
            sessionStorage.setItem('pkce_code_verifier', code_verifier);
          }
          // Clean up regardless
          localStorage.removeItem('pkce_code_verifier');
          localStorage.removeItem('pkce_code_verifier_ts');
        } catch (_) {
          // ignore storage issues
        }
      }
      if (!code_verifier) {
        throw new Error('Missing PKCE code verifier. Please start sign-in again.');
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
        window.location.replace('/library');
      }, 400);
      return () => clearTimeout(timer);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Authentication failed.');
    }
  }, []);

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Authentication error: ${error}`);
      return;
    }

    if (code) {
      setAuthCode(code);
      doExchange(code);
    } else {
      setStatus('error');
      setMessage('Missing authorization code in callback URL.');
    }
  }, [params, navigate, doExchange]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-2xl font-semibold">Authenticating…</h2>
        <p className={status === 'error' ? 'text-red-600' : 'text-gray-700'}>{message || 'Processing your sign-in…'}</p>
        {status === 'error' && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {authCode && (
              <button
                onClick={() => doExchange(authCode)}
                className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
