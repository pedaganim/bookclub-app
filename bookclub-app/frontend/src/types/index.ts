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
  coverImage?: string;
  images?: string[]; // Additional images beyond cover
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
  // User name from users table
  userName?: string;
  // Optional club context for the book (if applicable)
  clubId?: string;
  clubName?: string;
  clubIsPrivate?: boolean;
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
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  // Added when user is a member
  userRole?: 'admin' | 'member';
  joinedAt?: string;
  userStatus?: 'active' | 'pending';
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

export interface ExtractedMetadata {
  metadata: {
    title?: string;
    author?: string;
    isbn?: string;
    description?: string;
  };
  extractedText?: string;
  confidence?: number;
}

export interface S3UrlComponents {
  bucket: string;
  key: string;
}

// Direct Messaging types
export interface DMConversation {
  conversationId: string;
  userAId: string;
  userBId: string;
  lastMessageAt?: string;
  lastMessageSnippet?: string;
  unreadCountForUserA?: number;
  unreadCountForUserB?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DMMessage {
  conversationId: string;
  messageId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  createdAt: string;
}

export interface DMConversationList {
  items: DMConversation[];
}

export interface DMMessageList {
  items: DMMessage[];
  nextToken?: string;
}
