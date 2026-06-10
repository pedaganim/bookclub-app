import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { config } from '../config';
import { createPkcePair } from '../utils/pkce';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [session, setSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [obfuscatedPhone, setObfuscatedPhone] = useState('');
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/my-library" replace />;
  }

  const startOAuthFlow = async (provider: 'Google' | 'Facebook') => {
    setError('');
    try {
      const { code_verifier, code_challenge } = await createPkcePair();
      // Store in both sessionStorage and localStorage to handle some mobile browsers
      // that lose sessionStorage during external redirects
      sessionStorage.setItem('pkce_code_verifier', code_verifier);
      try {
        localStorage.setItem('pkce_code_verifier', code_verifier);
        localStorage.setItem('pkce_code_verifier_ts', String(Date.now()));
      } catch (_) {
        // ignore storage quota issues
      }
      const params = new URLSearchParams({
        response_type: config.cognito.responseType,
        client_id: config.cognito.userPoolClientId,
        redirect_uri: config.cognito.redirectSignIn,
        scope: config.cognito.scopes.join(' '),
        code_challenge,
        code_challenge_method: 'S256',
        identity_provider: provider,
      });
      const url = `https://${config.cognito.domain}/oauth2/authorize?${params.toString()}`;
      window.location.href = url;
    } catch (e: any) {
      console.error('OAuth Flow Error:', e);
      setError(`Failed to start ${provider} sign-in. Please try again.`);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('Please enter your phone number.');
      return;
    }

    // Format phone number (must start with + country code, e.g. +61400123456)
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      setError('Phone number must start with a + country code (e.g. +61400123456).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Pre-register the user under the hood if they don't exist
      // Since email is required in the Cognito schema, generate a placeholder email
      const tempPassword = `P@ssword-${Math.random().toString(36).slice(-8)}${Math.random().toString(36).toUpperCase().slice(-4)}!`;
      const placeholderEmail = `${formattedPhone.replace('+', '')}@phone.townwink.com`;

      try {
        await fetch(`https://cognito-idp.${config.cognito.region}.amazonaws.com/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
          },
          body: JSON.stringify({
            ClientId: config.cognito.userPoolClientId,
            Username: formattedPhone,
            Password: tempPassword,
            UserAttributes: [
              { Name: 'phone_number', Value: formattedPhone },
              { Name: 'email', Value: placeholderEmail },
            ],
          }),
        });
      } catch (err: any) {
        // UsernameExistsException is expected if they are already registered, so we ignore it.
        // For other errors, we log them but proceed to InitiateAuth (in case user exists).
        console.log('SignUp fallback log:', err);
      }

      // Step 2: Initiate Custom Auth Flow
      const response = await fetch(`https://cognito-idp.${config.cognito.region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'CUSTOM_AUTH',
          ClientId: config.cognito.userPoolClientId,
          AuthParameters: {
            USERNAME: formattedPhone,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code.');
      }

      if (data.ChallengeName !== 'CUSTOM_CHALLENGE') {
        throw new Error('UserPool client configuration issue: Expected CUSTOM_CHALLENGE trigger.');
      }

      setSession(data.Session);
      setObfuscatedPhone(data.ChallengeParameters?.phoneNumber || formattedPhone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://cognito-idp.${config.cognito.region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
        },
        body: JSON.stringify({
          ClientId: config.cognito.userPoolClientId,
          ChallengeName: 'CUSTOM_CHALLENGE',
          Session: session,
          ChallengeResponses: {
            USERNAME: phoneNumber.trim().replace(/\s+/g, ''),
            ANSWER: otpCode.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed. Please try again.');
      }

      if (!data.AuthenticationResult) {
        throw new Error('Authentication failed: Missing tokens.');
      }

      const { AccessToken, IdToken, RefreshToken } = data.AuthenticationResult;

      // Retrieve standard Cognito user profile
      const uresp = await fetch(`https://${config.cognito.domain}/oauth2/userInfo`, {
        headers: { Authorization: `Bearer ${AccessToken}` },
      });
      
      if (!uresp.ok) {
        throw new Error('Failed to retrieve user profile.');
      }
      
      const profile = await uresp.json();

      // Persist user & credentials locally
      localStorage.setItem('accessToken', AccessToken);
      if (RefreshToken) localStorage.setItem('refreshToken', RefreshToken);
      localStorage.setItem('idToken', IdToken);

      const userObj = {
        email: profile.email || '',
        name: profile.name || profile.given_name || profile.phone_number || 'Reader',
        sub: profile.sub,
      };
      localStorage.setItem('user', JSON.stringify(userObj));

      // Redirect user to the dashboard (forces page context reload)
      window.location.replace('/library');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <SEO 
        title="Login"
        description="Sign in to your Community Library account to discover books, join clubs, and connect with other readers in your neighborhood."
      />
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <div className="flex justify-center mb-4 sm:mb-6">
            <img 
              src="/townwink-logo.png" 
              alt="TownWink" 
              className="h-16 w-auto sm:h-24"
            />
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Sign in to TownWink
          </h2>
        </div>

        {/* Onboarding Strip */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-medium text-indigo-900">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <div className="flex items-center gap-2">
                <img src="/icons/upload.svg" alt="Upload" className="w-4 h-4" />
                <p className="text-sm text-indigo-800">Upload a book cover image — we auto-detect title and author</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <div className="flex items-center gap-2">
                <img src="/icons/swap.svg" alt="Swap" className="w-4 h-4" />
                <p className="text-sm text-indigo-800">Swap books with your friends and neighbours</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" aria-label="Search"><circle cx="11" cy="11" r="7" stroke="#4338ca" strokeWidth="2" fill="none"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
                <p className="text-sm text-indigo-800">Search for books within your groups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Sign-In Options */}
        {config.cognito.domain && config.cognito.userPoolClientId && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startOAuthFlow('Google')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium text-sm sm:text-base touch-manipulation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.343,6.053,28.878,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.343,6.053,28.878,4,24,4C17.091,4,10.922,7.613,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c4.743,0,9.106-1.811,12.432-4.771l-5.747-4.853C28.614,35.188,26.393,36,24,36 c-5.202,0-9.619-3.317-11.277-7.953l-6.548,5.047C10.771,40.556,16.926,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.158-4.109,5.575 c0.001-0.001,0.002-0.001,0.003-0.002l6.571,4.819C35.64,40.245,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => startOAuthFlow('Facebook')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium text-sm sm:text-base touch-manipulation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Facebook</span>
              </button>
            </div>

            {/* Separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500 font-medium">Or continue with phone</span>
              </div>
            </div>

            {/* Phone Passwordless Auth form */}
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone-number"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code prefix (e.g. +61 for Australia, +1 for US)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed touch-manipulation"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Verification Code
                  </label>
                  <input
                    id="otp-code"
                    name="code"
                    type="text"
                    required
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg letter-spacing-2 font-bold"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    6-digit code sent to {obfuscatedPhone}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed touch-manipulation"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>

                <div className="flex items-center justify-between text-sm mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtpCode('');
                      setError('');
                    }}
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                    disabled={loading}
                  >
                    Change Phone Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
