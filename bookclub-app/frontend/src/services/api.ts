import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, Book, BookListResponse, User, UploadUrlResponse, ProfileUpdateData, BookMetadata, BookClub, BookClubListResponse, ExtractedMetadata } from '../types';
import { config } from '../config';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private onSessionExpired?: () => void;

  constructor() {
    this.baseURL = config.apiBaseUrl;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      // Prefer idToken for API Gateway Cognito authorizer; fallback to accessToken
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const token = idToken || accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors and detect token expiration
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Check if this is a 401 error indicating token expiration
        if (error.response?.status === 401 && this.onSessionExpired) {
          // Check if the error is related to authentication/authorization
          const errorCode = error.response?.data?.error?.code;
          const errorMessage = error.response?.data?.error?.message?.toLowerCase() || '';
          
          // Trigger session expired logout only for specific token-related errors
          // Be more specific to avoid false positives on other 401s
          if (errorCode === 'UNAUTHORIZED' || 
              errorCode === 'TOKEN_EXPIRED' ||
              errorMessage.includes('token expired') ||
              errorMessage.includes('invalid token') ||
              errorMessage.includes('jwt expired')) {
            this.onSessionExpired();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Method to register session expiration callback
  setSessionExpiredHandler(handler: () => void) {
    this.onSessionExpired = handler;
  }

  // Auth methods
  // Commented out local register method - using Google OAuth only
  /*
  async register(userData: {
    email: string;
    name: string;
    password: string;
    bio?: string;
    timezone?: string;
  }): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.post('/auth/register', userData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
    return response.data.data!;
  }
  */

  // Commented out local login method - using Google OAuth only  
  /*
  async login(email: string, password: string): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await this.api.post('/auth/login', {
      email,
      password,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Login failed');
    }
    return response.data.data!;
  }
  */

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/users/me');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get user profile');
    }
    return response.data.data!;
  }

  async updateProfile(updates: ProfileUpdateData): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/users/me', updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update profile');
    }
    return response.data.data!;
  }

  // Book methods
  async createBook(bookData: {
    title: string;
    author: string;
    description?: string;
    coverImage?: string;
    status?: string;
    isbn?: string;
    enrichWithMetadata?: boolean;
  }): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.post('/books', bookData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create book');
    }
    return response.data.data!;
  }

  async searchBookMetadata(params: {
    isbn?: string;
    title?: string;
    author?: string;
  }): Promise<BookMetadata> {
    const queryParams = new URLSearchParams();
    if (params.isbn) queryParams.append('isbn', params.isbn);
    if (params.title) queryParams.append('title', params.title);
    if (params.author) queryParams.append('author', params.author);

    const response: AxiosResponse<ApiResponse<BookMetadata>> = await this.api.get(
      `/books/metadata?${queryParams.toString()}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to search book metadata');
    }
    return response.data.data!;
  }

  async getBook(bookId: string): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.get(`/books/${bookId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get book');
    }
    return response.data.data!;
  }

  async listBooks(params?: {
    userId?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<BookListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.nextToken) queryParams.append('nextToken', params.nextToken);

    const response: AxiosResponse<ApiResponse<BookListResponse>> = await this.api.get(
      `/books?${queryParams.toString()}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list books');
    }
    return response.data.data!;
  }

  async listBooksPublic(params?: {
    limit?: number;
    nextToken?: string;
  }): Promise<BookListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.nextToken) queryParams.append('nextToken', params.nextToken);

    // Create a request without authorization header for public access
    const response: AxiosResponse<ApiResponse<BookListResponse>> = await axios.get(
      `${this.baseURL}/books?${queryParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list books');
    }
    return response.data.data!;
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.put(`/books/${bookId}`, updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update book');
    }
    return response.data.data!;
  }

  async deleteBook(bookId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.delete(`/books/${bookId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete book');
    }
  }

  // File upload methods
  async generateUploadUrl(fileType: string, fileName?: string): Promise<UploadUrlResponse> {
    const response: AxiosResponse<ApiResponse<UploadUrlResponse>> = await this.api.post('/upload-url', {
      fileType,
      fileName,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to generate upload URL');
    }
    return response.data.data!;
  }

  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  // Add method to get pre-extracted metadata with exponential backoff
  async getPreExtractedMetadata(s3Bucket: string, s3Key: string): Promise<ExtractedMetadata | null> {
    const maxAttempts = 6; // e.g., total wait time up to ~7.5s (0.5+1+1.5+2+2.5+3)
    let attempt = 0;
    let delay = 500; // start with 500ms
    
    while (attempt < maxAttempts) {
      try {
        const response: AxiosResponse<ApiResponse<ExtractedMetadata>> = await this.api.get(`/images/metadata?s3Bucket=${encodeURIComponent(s3Bucket)}&s3Key=${encodeURIComponent(s3Key)}`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Attempt ${attempt + 1}: Pre-extracted metadata not available yet.`, error);
      }
      
      // Wait before next attempt (exponential backoff)
      const currentDelay = delay;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      attempt++;
      delay = Math.min(delay + 500, 3000); // increase delay, max 3s
    }
    
    // After max attempts, return null
    return null;
  }

  // Image processing methods
  async extractImageMetadata(s3Bucket: string, s3Key: string): Promise<ExtractedMetadata> {
    const response: AxiosResponse<ApiResponse<ExtractedMetadata>> = await this.api.post('/images/extract-metadata', {
      s3Bucket,
      s3Key,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to extract image metadata');
    }
    return response.data.data!;
  }

  // Club methods
  async createClub(clubData: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    memberLimit?: number;
  }): Promise<BookClub> {
    const response: AxiosResponse<ApiResponse<BookClub>> = await this.api.post('/clubs', clubData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create club');
    }
    return response.data.data!;
  }

  async getUserClubs(): Promise<BookClubListResponse> {
    const response: AxiosResponse<ApiResponse<BookClubListResponse>> = await this.api.get('/clubs');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get clubs');
    }
    return response.data.data!;
  }

  async getClub(clubId: string): Promise<BookClub> {
    const response: AxiosResponse<ApiResponse<BookClub>> = await this.api.get(`/clubs/${clubId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get club');
    }
    return response.data.data!;
  }

  async joinClub(inviteCode: string): Promise<BookClub> {
    const response: AxiosResponse<ApiResponse<BookClub>> = await this.api.post('/clubs/join', {
      inviteCode,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to join club');
    }
    return response.data.data!;
  }

  async leaveClub(clubId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.delete(`/clubs/${clubId}/leave`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to leave club');
    }
  }
}

export const apiService = new ApiService();
