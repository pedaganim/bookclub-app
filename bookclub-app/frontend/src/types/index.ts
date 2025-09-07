export interface User {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
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
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

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
