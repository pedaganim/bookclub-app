export interface User {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  createdAt: string;
}

export interface Book {
  bookId: string;
  userId: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  status: 'available' | 'borrowed' | 'reading';
  // Extended metadata fields
  isbn10?: string;
  isbn13?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  publisher?: string;
  metadataSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookMetadata {
  title?: string;
  authors?: string[];
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  isbn10?: string;
  isbn13?: string;
  thumbnail?: string;
  smallThumbnail?: string;
  publisher?: string;
  source?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

// Commented out LoginResponse type - using Google OAuth only
/*
export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
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

export interface BookListResponse {
  items: Book[];
  nextToken?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
}
