import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please check your email link.');
      setCanResend(true);
      return;
    }

    const verifyEmail = async () => {
      try {
        await apiService.verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/onboarding');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email. The link may be invalid or expired.');
        setCanResend(true);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    try {
      setResending(true);
      await apiService.sendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
      setCanResend(false);
      setTimeout(() => setCanResend(true), 60000); // Allow resend after 1 minute
    } catch (err: any) {
      setMessage(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.svg" alt="Book Club" className="h-16 w-auto" />
          </div>
          
          {status === 'verifying' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verifying your email...</h2>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              
              {canResend && (
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
