/**
 * Authentication context for managing user authentication state
 * Provides authentication functionality throughout the React application
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginResponse } from '../types';
import { apiService } from '../services/api';

/**
 * Type definition for the authentication context
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    name: string;
    password: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to access authentication context
 * @returns AuthContextType object with authentication state and methods
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Props interface for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component that wraps the application
 * Manages authentication state and provides auth methods to child components
 * @param props - Component props
 * @param props.children - Child components to wrap with auth context
 * @returns JSX element providing authentication context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          // Optionally verify token is still valid
          try {
            const currentUser = await apiService.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Authenticates a user with email and password
   * Stores authentication tokens and user data in localStorage
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if login fails
   */
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

  /**
   * Registers a new user account and automatically logs them in
   * @param userData - User registration data
   * @param userData.email - User's email address
   * @param userData.name - User's display name
   * @param userData.password - User's password
   * @param userData.bio - Optional user biography
   * @throws Error if registration or login fails
   */
  const register = async (userData: {
    email: string;
    name: string;
    password: string;
    bio?: string;
  }): Promise<void> => {
    try {
      await apiService.register(userData);
      // After successful registration, automatically log in
      await login(userData.email, userData.password);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Logs out the current user
   * Clears all authentication tokens and user data from localStorage
   */
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
