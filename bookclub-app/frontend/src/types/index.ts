/**
 * TypeScript type definitions for the BookClub application
 * Contains interfaces for all data models and API responses
 */

/**
 * User entity interface
 */
export interface User {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  createdAt: string;
}

/**
 * Book entity interface
 */
export interface Book {
  bookId: string;
  userId: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  status: 'available' | 'borrowed' | 'reading';
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication tokens interface
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

/**
 * Login API response interface
 */
export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * Generic API response wrapper interface
 * @template T - Type of the data payload
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string>;
  };
}

/**
 * Book list API response interface
 */
export interface BookListResponse {
  items: Book[];
  nextToken?: string;
}

/**
 * File upload URL response interface
 */
export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
}
