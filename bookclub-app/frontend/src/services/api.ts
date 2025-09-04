import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, Book, BookListResponse, LoginResponse, User, UploadUrlResponse } from '../types';

/**
 * API service class for handling all HTTP requests to the backend
 * Provides a centralized interface for authentication, book management, and file operations
 */
class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  /**
   * Creates a new ApiService instance with configured axios client
   * Sets up request/response interceptors for authentication and error handling
   */
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000/dev';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  /**
   * Registers a new user account
   * @param userData - User registration data
   * @param userData.email - User's email address
   * @param userData.name - User's display name
   * @param userData.password - User's password
   * @param userData.bio - Optional user biography
   * @returns Promise resolving to the created user object
   * @throws Error if registration fails
   */
  async register(userData: {
    email: string;
    name: string;
    password: string;
    bio?: string;
  }): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.post('/auth/register', userData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
    return response.data.data!;
  }

  /**
   * Authenticates a user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to login response with user data and tokens
   * @throws Error if login fails
   */
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

  /**
   * Retrieves the current authenticated user's profile
   * @returns Promise resolving to the current user's data
   * @throws Error if request fails or user is not authenticated
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/users/me');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get user profile');
    }
    return response.data.data!;
  }

  // Book methods
  /**
   * Creates a new book entry
   * @param bookData - Book information
   * @param bookData.title - Book title
   * @param bookData.author - Book author
   * @param bookData.description - Optional book description
   * @param bookData.coverImage - Optional book cover image URL
   * @param bookData.status - Optional book status (e.g., 'available', 'borrowed')
   * @returns Promise resolving to the created book object
   * @throws Error if book creation fails
   */
  async createBook(bookData: {
    title: string;
    author: string;
    description?: string;
    coverImage?: string;
    status?: string;
  }): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.post('/books', bookData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create book');
    }
    return response.data.data!;
  }

  /**
   * Retrieves a specific book by its ID
   * @param bookId - Unique identifier of the book
   * @returns Promise resolving to the book object
   * @throws Error if book is not found or request fails
   */
  async getBook(bookId: string): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.get(`/books/${bookId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get book');
    }
    return response.data.data!;
  }

  /**
   * Retrieves a list of books with optional filtering
   * @param params - Optional query parameters
   * @param params.userId - Filter books by user ID
   * @param params.limit - Maximum number of books to return
   * @param params.nextToken - Pagination token for next page
   * @returns Promise resolving to book list response with pagination info
   * @throws Error if request fails
   */
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

  /**
   * Updates an existing book
   * @param bookId - Unique identifier of the book to update
   * @param updates - Partial book object containing fields to update
   * @returns Promise resolving to the updated book object
   * @throws Error if book is not found or update fails
   */
  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.put(`/books/${bookId}`, updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update book');
    }
    return response.data.data!;
  }

  /**
   * Deletes a book by its ID
   * @param bookId - Unique identifier of the book to delete
   * @returns Promise that resolves when book is successfully deleted
   * @throws Error if book is not found or deletion fails
   */
  async deleteBook(bookId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.delete(`/books/${bookId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete book');
    }
  }

  // File upload methods
  /**
   * Generates a pre-signed URL for file upload to S3
   * @param fileType - MIME type of the file to upload
   * @param fileName - Optional custom filename
   * @returns Promise resolving to upload URL and file key
   * @throws Error if URL generation fails
   */
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

  /**
   * Uploads a file to S3 using a pre-signed URL
   * @param uploadUrl - Pre-signed URL obtained from generateUploadUrl
   * @param file - File object to upload
   * @returns Promise that resolves when upload is complete
   * @throws Error if upload fails
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }
}

/**
 * Singleton instance of the API service for application-wide use
 */
export const apiService = new ApiService();
