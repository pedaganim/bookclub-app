export interface User {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  timezone?: string;
  createdAt: string;
}

export interface Book {
  bookId: string;
  userId: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string; // Legacy field for backward compatibility
  images?: string[]; // New multi-image support (up to 25 images)
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

export interface ProfileUpdateData {
  name?: string;
  bio?: string;
  profilePicture?: string;
  timezone?: string;
}

export interface BookClub {
  clubId: string;
  name: string;
  description?: string;
  location: string;
  createdBy: string;
  inviteCode: string;
  isPrivate: boolean;
  memberLimit?: number;
  createdAt: string;
  updatedAt: string;
  // Added when user is a member
  userRole?: 'admin' | 'member';
  joinedAt?: string;
}

export interface BookClubMember {
  clubId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface BookClubListResponse {
  items: BookClub[];
  count: number;
}
