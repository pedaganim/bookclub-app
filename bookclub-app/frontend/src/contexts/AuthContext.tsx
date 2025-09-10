import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ProfileUpdateData } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationContext';

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
    setUser(null);
  };

  const logoutWithSessionExpired = useCallback(() => {
    logout();
    addNotification('warning', 'Your session has expired. Please sign in again to continue.', 7000);
    navigate('/login');
  }, [addNotification, navigate]);

  useEffect(() => {
    // Register session expiration handler with API service
    apiService.setSessionExpiredHandler(logoutWithSessionExpired);

    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          // Optionally verify token is still valid; do not force logout on transient failure
          try {
            const currentUser = await apiService.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // Keep existing tokens and user to avoid bounce back to /login; user can retry actions
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
