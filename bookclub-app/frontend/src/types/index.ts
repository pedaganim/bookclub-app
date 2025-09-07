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
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdBy: string;
  memberCount: number;
  members: string[];
  isPublic: boolean;
  maxMembers: number;
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

export interface GroupListResponse {
  items: Group[];
  nextToken?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}
