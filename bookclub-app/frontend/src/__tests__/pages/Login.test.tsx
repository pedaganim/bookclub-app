import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../../pages/Login';
import { createPkcePair } from '../../utils/pkce';

// Mock SEO component
jest.mock('../../components/SEO', () => () => <div data-testid="seo" />);

// Mock AuthContext
const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom Navigate
jest.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: any) => <div data-testid="navigate" data-to={to} data-replace={String(replace)} />,
}));

// Mock pkce utility
jest.mock('../../utils/pkce', () => ({
  createPkcePair: jest.fn().mockResolvedValue({
    code_verifier: 'test-code-verifier',
    code_challenge: 'test-code-challenge',
  }),
}));

// Mock config
jest.mock('../../config', () => ({
  config: {
    cognito: {
      domain: 'auth.townwink.com',
      region: 'us-east-1',
      userPoolClientId: 'test-client-id',
      responseType: 'code',
      redirectSignIn: 'http://localhost:3000/auth/callback',
      scopes: ['openid', 'email', 'profile'],
    },
  },
}));

describe('Login Page', () => {
  const originalLocation = window.location;
  let mockFetch: jest.Mock;

  beforeAll(() => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: '',
      replace: jest.fn(),
    } as any;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
    });
    (createPkcePair as jest.Mock).mockResolvedValue({
      code_verifier: 'test-code-verifier',
      code_challenge: 'test-code-challenge',
    });
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    (window.location as any).href = '';
    (window.location.replace as jest.Mock).mockClear();
  });

  test('should redirect to /my-library if user is already authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
    });

    render(<Login />);

    const navigateEl = screen.getByTestId('navigate');
    expect(navigateEl).toBeInTheDocument();
    expect(navigateEl).toHaveAttribute('data-to', '/my-library');
  });

  test('should start Google OAuth flow when clicking Google button', async () => {
    render(<Login />);

    const googleBtn = screen.getByRole('button', { name: /google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(sessionStorage.getItem('pkce_code_verifier')).toBe('test-code-verifier');
      expect(window.location.href).toContain('identity_provider=Google');
      expect(window.location.href).toContain('client_id=test-client-id');
    });
  });

  test('should start Facebook OAuth flow when clicking Facebook button', async () => {
    render(<Login />);

    const facebookBtn = screen.getByRole('button', { name: /facebook/i });
    fireEvent.click(facebookBtn);

    await waitFor(() => {
      expect(sessionStorage.getItem('pkce_code_verifier')).toBe('test-code-verifier');
      expect(window.location.href).toContain('identity_provider=Facebook');
      expect(window.location.href).toContain('client_id=test-client-id');
    });
  });

  test('should transition to OTP step after phone number submission', async () => {
    // Mock SignUp (success) and InitiateAuth (custom challenge)
    mockFetch.mockImplementation((url, options) => {
      const body = JSON.parse(options.body);
      if (options.headers['X-Amz-Target'].endsWith('.SignUp')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ UserSub: 'mock-sub' }),
        });
      } else if (options.headers['X-Amz-Target'].endsWith('.InitiateAuth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: 'mock-session-id',
            ChallengeParameters: { phoneNumber: '+******1234' }
          }),
        });
      }
      return Promise.reject(new Error('Unknown request'));
    });

    render(<Login />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '+61400123432' } });

    const submitBtn = screen.getByRole('button', { name: /send verification code/i });
    fireEvent.click(submitBtn);

    // Verify SignUp was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText(/enter verification code/i)).toBeInTheDocument();
      expect(screen.getByText(/6-digit code sent to \+\*\*\*\*\*\*1234/i)).toBeInTheDocument();
    });
  });

  test('should sign in successfully when verifying OTP code', async () => {
    // 1. Setup fetch mocks for OTP transition and response challenge validation
    mockFetch.mockImplementation((url, options) => {
      const target = options.headers['X-Amz-Target'] || '';
      
      if (target.endsWith('.SignUp')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ UserSub: 'mock-sub' }),
        });
      }
      
      if (target.endsWith('.InitiateAuth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: 'mock-session-id',
            ChallengeParameters: { phoneNumber: '+******1234' }
          }),
        });
      }

      if (target.endsWith('.RespondToAuthChallenge')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              IdToken: 'mock-id-token',
              RefreshToken: 'mock-refresh-token'
            }
          }),
        });
      }

      // Handle userInfo call
      if (url.toString().includes('/oauth2/userInfo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sub: 'mock-sub',
            email: '+61400123432@phone.townwink.com',
            phone_number: '+61400123432',
            name: 'Tester'
          }),
        });
      }

      return Promise.reject(new Error('Unknown request'));
    });

    render(<Login />);

    // Trigger OTP phase
    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '+61400123432' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/enter verification code/i)).toBeInTheDocument();
    });

    // Enter verification code and submit
    const codeInput = screen.getByLabelText(/enter verification code/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify & log in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
      expect(localStorage.getItem('idToken')).toBe('mock-id-token');
      expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual({
        sub: 'mock-sub',
        email: '+61400123432@phone.townwink.com',
        name: 'Tester'
      });
      expect(window.location.replace).toHaveBeenCalledWith('/library');
    });
  });

  test('should display error message on code verification failure', async () => {
    // 1. Setup fetch mocks for OTP transition
    mockFetch.mockImplementation((url, options) => {
      const target = options.headers['X-Amz-Target'] || '';
      
      if (target.endsWith('.SignUp')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ UserSub: 'mock-sub' }),
        });
      }
      
      if (target.endsWith('.InitiateAuth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: 'mock-session-id',
            ChallengeParameters: { phoneNumber: '+******1234' }
          }),
        });
      }

      if (target.endsWith('.RespondToAuthChallenge')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            message: 'Invalid code provided'
          }),
        });
      }

      return Promise.reject(new Error('Unknown request'));
    });

    render(<Login />);

    // Trigger OTP phase
    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '+61400123432' } });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/enter verification code/i)).toBeInTheDocument();
    });

    // Enter verification code and submit
    const codeInput = screen.getByLabelText(/enter verification code/i);
    fireEvent.change(codeInput, { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: /verify & log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid code provided')).toBeInTheDocument();
    });
  });
});