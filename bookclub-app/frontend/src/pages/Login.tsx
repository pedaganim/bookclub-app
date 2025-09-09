import React, { useState } from 'react';
import { config } from '../config';
import { createPkcePair } from '../utils/pkce';

const Login: React.FC = () => {
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.svg" 
              alt="Book Club" 
              className="h-24 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to BookClub
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            More login options will be added in the future
          </p>
        </div>

        {/* Onboarding Strip */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-indigo-900">Getting Started with BookClub</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <p className="text-sm text-indigo-800">Sign in with your Google account</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <p className="text-sm text-indigo-800">Create a new book club or join an existing one</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <p className="text-sm text-indigo-800">Add books to your club's reading list</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">4</div>
              <p className="text-sm text-indigo-800">Schedule meetings and start discussions</p>
            </div>
          </div>
        </div>

        {/* Google Sign-In */}
        {config.cognito.domain && config.cognito.userPoolClientId && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { code_verifier, code_challenge } = await createPkcePair();
                  sessionStorage.setItem('pkce_code_verifier', code_verifier);
                  const params = new URLSearchParams({
                    response_type: config.cognito.responseType,
                    client_id: config.cognito.userPoolClientId,
                    redirect_uri: config.cognito.redirectSignIn,
                    scope: config.cognito.scopes.join(' '),
                    code_challenge,
                    code_challenge_method: 'S256',
                  });
                  const url = `https://${config.cognito.domain}/oauth2/authorize?${params.toString()}`;
                  window.location.href = url;
                } catch (e) {
                  setError('Failed to start Google sign-in. Please try again.');
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.343,6.053,28.878,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.343,6.053,28.878,4,24,4C17.091,4,10.922,7.613,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c4.743,0,9.106-1.811,12.432-4.771l-5.747-4.853C28.614,35.188,26.393,36,24,36 c-5.202,0-9.619-3.317-11.277-7.953l-6.548,5.047C10.771,40.556,16.926,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.158-4.109,5.575 c0.001-0.001,0.002-0.001,0.003-0.002l6.571,4.819C35.64,40.245,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              <span>Continue with Google</span>
            </button>
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
