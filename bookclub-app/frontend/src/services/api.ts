import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, Book, BookListResponse, LoginResponse, User, UploadUrlResponse, Group, GroupListResponse } from '../types';
import { config } from '../config';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

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

    // Add response interceptor to handle errors (do not auto-redirect on 401)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Let calling code decide how to handle 401s to avoid login bounce loops
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
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

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/users/me');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get user profile');
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
  }): Promise<Book> {
    const response: AxiosResponse<ApiResponse<Book>> = await this.api.post('/books', bookData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create book');
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

  // Group methods
  async createGroup(groupData: {
    name: string;
    description?: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    isPublic?: boolean;
    maxMembers?: number;
  }): Promise<Group> {
    const response: AxiosResponse<ApiResponse<Group>> = await this.api.post('/groups', groupData);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create group');
    }
    return response.data.data!;
  }

  async getGroup(groupId: string): Promise<Group> {
    const response: AxiosResponse<ApiResponse<Group>> = await this.api.get(`/groups/${groupId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get group');
    }
    return response.data.data!;
  }

  async listGroups(params?: {
    limit?: number;
    nextToken?: string;
  }): Promise<GroupListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.nextToken) queryParams.append('nextToken', params.nextToken);

    const response: AxiosResponse<ApiResponse<GroupListResponse>> = await this.api.get(
      `/groups?${queryParams.toString()}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list groups');
    }
    return response.data.data!;
  }

  async getNearbyGroups(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }): Promise<GroupListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('latitude', params.latitude.toString());
    queryParams.append('longitude', params.longitude.toString());
    if (params.radius) queryParams.append('radius', params.radius.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response: AxiosResponse<ApiResponse<GroupListResponse>> = await this.api.get(
      `/groups/nearby?${queryParams.toString()}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get nearby groups');
    }
    return response.data.data!;
  }

  async joinGroup(groupId: string): Promise<Group> {
    const response: AxiosResponse<ApiResponse<Group>> = await this.api.post(`/groups/${groupId}/join`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to join group');
    }
    return response.data.data!;
  }

  async leaveGroup(groupId: string): Promise<Group> {
    const response: AxiosResponse<ApiResponse<Group>> = await this.api.post(`/groups/${groupId}/leave`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to leave group');
    }
    return response.data.data!;
  }
}

export const apiService = new ApiService();
