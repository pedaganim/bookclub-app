import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ProfileUpdateData } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationContext';
import { config } from '../config';
import { getCookie, setCookie, eraseCookie, getBaseDomain } from '../utils/cookies';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  updateProfile: (updates: ProfileUpdateData) => Promise<void>;
  logout: () => void;
  logoutWithSessionExpired: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('user');
    
    // Also clear cookies
    const domain = getBaseDomain();
    eraseCookie('accessToken', domain);
    eraseCookie('refreshToken', domain);
    eraseCookie('idToken', domain);
    eraseCookie('user', domain);
    
    setUser(null);
  };

  const logoutWithSessionExpired = useCallback(() => {
    logout();
    addNotification('warning', 'Your session has expired. Please sign in again to continue.', 7000);
    // Redirect to the main domain login page to ensure PKCE works correctly
    window.location.href = `${config.apiBaseUrl.replace('api.', '')}/login`;
  }, [addNotification]);

  useEffect(() => {
    // Register session expiration handler with API service (only once)
    apiService.setSessionExpiredHandler(logoutWithSessionExpired);

    if (config.skipAuth) {
      const dummyUser: User = {
        userId: 'local-user',
        email: 'local@dev',
        name: 'Local Dev',
        bio: '',
        profilePicture: undefined,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('accessToken', 'local-token-local-user');
      localStorage.setItem('user', JSON.stringify(dummyUser));
      setUser(dummyUser);
      setLoading(false);
      return;
    }

    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        // Try localStorage first
        let idToken = localStorage.getItem('idToken');
        let accessToken = localStorage.getItem('accessToken');
        let userJson = localStorage.getItem('user');
        
        // Fallback to cookies for subdomain support
        if (!idToken) idToken = getCookie('idToken');
        if (!accessToken) accessToken = getCookie('accessToken');
        if (!userJson) userJson = getCookie('user');
        
        const token = idToken || accessToken;
        
        if (token && userJson) {
          const parsedUser = JSON.parse(userJson);
          setUser(parsedUser);
          
          // If we recovered from cookies but localStorage is empty, top it up
          if (!localStorage.getItem('idToken') && idToken) localStorage.setItem('idToken', idToken);
          if (!localStorage.getItem('accessToken') && accessToken) localStorage.setItem('accessToken', accessToken);
          if (!localStorage.getItem('user') && userJson) localStorage.setItem('user', userJson);

          // Verify token is still valid
          try {
            const currentUser = await apiService.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
            // Update cookie too
            setCookie('user', JSON.stringify(currentUser), { domain: getBaseDomain() });
          } catch (error: any) {
            // If the token is definitively invalid (401/403), clear the session.
            // This prevents "caching" issues with stale tokens in the regular browser.
            if (error.response?.status === 401 || error.response?.status === 403) {
              console.warn('Initial auth check failed, clearing session');
              logout();
            }
          }
        }
      } catch (error) {
        // Auth initialization error handled silently
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [logoutWithSessionExpired]);

  // Commented out local auth methods - using Google OAuth only
  /*
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response: LoginResponse = await apiService.login(email, password);
      
      // Store tokens and user data
      localStorage.setItem('accessToken', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    name: string;
    password: string;
    bio?: string;
    timezone?: string;
  }): Promise<void> => {
    try {
      await apiService.register(userData);
      // After successful registration, automatically log in
      await login(userData.email, userData.password);
    } catch (error) {
      throw error;
    }
  };
  */

  const updateProfile = async (updates: ProfileUpdateData): Promise<void> => {
    try {
      const updatedUser = await apiService.updateProfile(updates);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Update cookie too
      setCookie('user', JSON.stringify(updatedUser), { domain: getBaseDomain() });
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    updateProfile,
    logout,
    logoutWithSessionExpired,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
