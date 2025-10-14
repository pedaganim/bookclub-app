import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, Book, BookListResponse, User, UploadUrlResponse, ProfileUpdateData, BookMetadata, BookClub, BookClubListResponse, ExtractedMetadata, DMConversation, DMConversationList, DMMessage, DMMessageList } from '../types';
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
      // Prefer Cognito ID token for API Gateway Cognito authorizer; fallback to Access Token.
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      const token = idToken || accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors and detect auth failures
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Redirect to login on any authentication/authorization failure
        if ((error.response?.status === 401 || error.response?.status === 403) && this.onSessionExpired) {
          // Previously, we only redirected for specific token errors. To ensure consistent UX,
          // we now redirect on any 401/403 from protected endpoints.
          this.onSessionExpired();
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

  // Notification preferences
  async getNotificationPrefs(): Promise<{ emailOptIn: boolean; prefs: Record<string, boolean> }>{
    const response = await this.api.get('/users/me/notifications');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to fetch notification preferences');
    }
    return response.data.data as { emailOptIn: boolean; prefs: Record<string, boolean> };
  }

  async updateNotificationPrefs(update: { emailOptIn?: boolean; prefs?: Record<string, boolean> }): Promise<{ emailOptIn: boolean; prefs: Record<string, boolean> }>{
    const response = await this.api.put('/users/me/notifications', update);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update notification preferences');
    }
    return response.data.data as { emailOptIn: boolean; prefs: Record<string, boolean> };
  }

  async updateProfile(updates: ProfileUpdateData): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/users/me', updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update profile');
    }
    return response.data.data!;
  }

  // Email verification and onboarding methods
  async sendVerificationEmail(): Promise<{ message: string }> {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.post('/auth/send-verification');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send verification email');
    }
    return response.data.data!;
  }

  async verifyEmail(token: string): Promise<{ message: string; user: User }> {
    const response: AxiosResponse<ApiResponse<{ message: string; user: User }>> = await this.api.post('/auth/verify-email', { token });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to verify email');
    }
    return response.data.data!;
  }

  async completeOnboarding(): Promise<{ message: string; user: User }> {
    const response: AxiosResponse<ApiResponse<{ message: string; user: User }>> = await this.api.post('/users/me/complete-onboarding');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to complete onboarding');
    }
    return response.data.data!;
  }

  // Club invite methods
  async getClubInviteLink(clubId: string): Promise<{ inviteCode: string; inviteUrl: string }> {
    const response: AxiosResponse<ApiResponse<{ inviteCode: string; inviteUrl: string }>> = await this.api.get(`/clubs/${clubId}/invite-link`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get invite link');
    }
    return response.data.data!;
  }

  async sendClubInvite(data: { clubId: string; email: string; name?: string }): Promise<{ message: string; inviteUrl: string }> {
    const response: AxiosResponse<ApiResponse<{ message: string; inviteUrl: string }>> = await this.api.post('/clubs/invite', data);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send invite');
    }
    return response.data.data!;
  }

  // Book methods
  async createBook(bookData: {
    title?: string;
    author?: string;
    description?: string;
    coverImage?: string;
    status?: string;
    isbn?: string;
    enrichWithMetadata?: boolean;
    extractFromImage?: boolean;
    s3Bucket?: string;
    s3Key?: string;
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
    search?: string;
    ageGroupFine?: string;
    bare?: boolean;
  }): Promise<BookListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.nextToken) queryParams.append('nextToken', params.nextToken);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ageGroupFine) queryParams.append('ageGroupFine', params.ageGroupFine);
    if (params?.bare) queryParams.append('bare', '1');

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
      // Mobile networks can be slow; extend timeout for PUT to S3
      timeout: 15 * 60 * 1000, // 15 minutes
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  // Multipart upload helpers
  async multipartStart(fileType: string, fileName?: string): Promise<{ bucket: string; key: string; uploadId: string }> {
    const res: AxiosResponse<ApiResponse<{ bucket: string; key: string; uploadId: string }>> = await this.api.post('/upload/multipart/start', { fileType, fileName });
    if (!res.data.success) throw new Error(res.data.error?.message || 'Failed to start multipart upload');
    return res.data.data!;
  }

  async multipartSignPart(params: { key: string; uploadId: string; partNumber: number; contentType?: string }): Promise<{ uploadUrl: string }>{
    const res: AxiosResponse<ApiResponse<{ uploadUrl: string }>> = await this.api.post('/upload/multipart/sign-part', params);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Failed to sign part');
    return res.data.data!;
  }

  async multipartComplete(params: { key: string; uploadId: string; parts: Array<{ ETag: string; PartNumber: number }> }): Promise<{ fileUrl: string; bucket: string; key: string }>{
    const res: AxiosResponse<ApiResponse<{ fileUrl: string; bucket: string; key: string }>> = await this.api.post('/upload/multipart/complete', params);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Failed to complete multipart upload');
    return res.data.data!;
  }

  // High-level uploader: uses multipart for large files
  async uploadAnySize(file: File, opts: { partSize?: number; partConcurrency?: number; multipartThreshold?: number } = {}): Promise<{ fileUrl: string; bucket?: string; key?: string }>{
    const partSize = Math.max(5 * 1024 * 1024, opts.partSize || 8 * 1024 * 1024); // >=5MB
    const partConcurrency = Math.max(1, opts.partConcurrency || 5);
    const threshold = opts.multipartThreshold ?? 8 * 1024 * 1024;

    if (file.size <= threshold) {
      const { uploadUrl, fileUrl, fileKey } = await this.generateUploadUrl(file.type, file.name);
      await this.uploadFile(uploadUrl, file);
      // Try to parse bucket/key from fileUrl
      try {
        const u = new URL(fileUrl);
        const bucket = u.hostname.split('.s3.amazonaws.com')[0];
        const key = u.pathname.replace(/^\//, '');
        return { fileUrl, bucket, key };
      } catch {
        return { fileUrl, key: fileKey } as any;
      }
    }

    // Multipart
    const { key, uploadId } = await this.multipartStart(file.type, file.name);

    const totalParts = Math.ceil(file.size / partSize);
    const partsEtags: Array<{ ETag: string; PartNumber: number }> = new Array(totalParts);

    const queue: number[] = Array.from({ length: totalParts }, (_, i) => i);
    const runPart = async (index: number) => {
      const start = index * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      const partNumber = index + 1;
      const { uploadUrl } = await this.multipartSignPart({ key, uploadId, partNumber, contentType: file.type });
      const putRes = await axios.put(uploadUrl, blob, {
        headers: { 'Content-Type': file.type },
        timeout: 15 * 60 * 1000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const eTag = (putRes.headers.etag || putRes.headers.ETag || '').replace(/\"/g, '');
      partsEtags[index] = { ETag: eTag, PartNumber: partNumber };
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(partConcurrency, queue.length); i++) {
      workers.push((async function worker() {
        while (queue.length) {
          const idx = queue.shift();
          if (idx === undefined) break;
          await runPart(idx);
        }
      })());
    }
    await Promise.all(workers);

    const { fileUrl } = await this.multipartComplete({ key, uploadId, parts: partsEtags });
    return { fileUrl, key };
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

  async updateClub(clubId: string, updates: Partial<BookClub>): Promise<BookClub> {
    const response: AxiosResponse<ApiResponse<BookClub>> = await this.api.patch(`/clubs/${clubId}`, updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update club');
    }
    return response.data.data!;
  }

  async deleteClub(clubId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.delete(`/clubs/${clubId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete club');
    }
  }

  async requestClubJoin(clubId: string): Promise<{ status: 'pending' | 'active' }> {
    const response: AxiosResponse<ApiResponse<{ status: 'pending' | 'active' }>> = await this.api.post(`/clubs/${clubId}/request`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to request club join');
    }
    // Some handlers may return plain object without ApiResponse
    const data = (response.data && (response.data as any).data) || (response.data as any);
    return (data && data.status) ? data : { status: 'pending' };
  }

  // Browse public clubs
  async browseClubs(params?: { limit?: number; nextToken?: string; search?: string }): Promise<{ items: BookClub[]; nextToken?: string }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.nextToken) query.append('nextToken', params.nextToken);
    if (params?.search) query.append('search', params.search);
    const response: AxiosResponse<ApiResponse<{ items: BookClub[]; nextToken?: string }>> = await this.api.get(`/clubs/browse?${query.toString()}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to browse clubs');
    }
    return response.data.data!;
  }

  // Admin - list pending join requests for a club
  async listJoinRequests(clubId: string): Promise<{ items: Array<{ clubId: string; userId: string; status: string; requestedAt?: string }> }> {
    const response: AxiosResponse<ApiResponse<{ items: Array<{ clubId: string; userId: string; status: string; requestedAt?: string }> }>> = await this.api.get(`/clubs/${clubId}/requests`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list join requests');
    }
    return response.data.data!;
  }

  // Admin - approve join request
  async approveJoinRequest(clubId: string, userId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<{ approved: boolean }>> = await this.api.post(`/clubs/${clubId}/requests/${userId}/approve`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to approve join request');
    }
  }

  // Admin - reject join request
  async rejectJoinRequest(clubId: string, userId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<{ rejected: boolean }>> = await this.api.post(`/clubs/${clubId}/requests/${userId}/reject`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to reject join request');
    }
  }

  // Direct Messaging
  async dmCreateConversation(toUserId: string): Promise<DMConversation> {
    const response: AxiosResponse<ApiResponse<DMConversation>> = await this.api.post('/dm/conversations', { toUserId });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create conversation');
    }
    return response.data.data!;
  }

  async dmListConversations(limit = 20): Promise<DMConversationList> {
    const response: AxiosResponse<ApiResponse<DMConversationList>> = await this.api.get(`/dm/conversations?limit=${limit}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list conversations');
    }
    return response.data.data!;
  }

  async dmSendMessage(conversationId: string, toUserId: string, content: string): Promise<DMMessage> {
    const response: AxiosResponse<ApiResponse<DMMessage>> = await this.api.post(`/dm/conversations/${conversationId}/messages`, { toUserId, content });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send message');
    }
    return response.data.data!;
  }

  async dmListMessages(conversationId: string, limit = 20, nextToken?: string): Promise<DMMessageList> {
    const query = new URLSearchParams();
    query.set('limit', String(limit));
    if (nextToken) query.set('nextToken', nextToken);
    const response: AxiosResponse<ApiResponse<DMMessageList>> = await this.api.get(`/dm/conversations/${conversationId}/messages?${query.toString()}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list messages');
    }
    return response.data.data!;
  }

  async dmMarkRead(conversationId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<{ read: boolean }>> = await this.api.patch(`/dm/conversations/${conversationId}/read`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to mark conversation as read');
    }
  }

  // Public user lookup
  async getUserPublic(userId: string): Promise<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'>> {
    const response: AxiosResponse<ApiResponse<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'>>> = await this.api.get(`/users/${userId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch user');
    }
    return response.data.data;
  }

  async findUserByEmail(email: string): Promise<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'> | null> {
    const response: AxiosResponse<ApiResponse<Pick<User, 'userId' | 'name' | 'email' | 'profilePicture'>>> = await this.api.get(`/users/query?email=${encodeURIComponent(email)}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to find user');
    }
    return response.data.data || null;
  }

  // Generic request method for custom endpoints
  async request<T>(endpoint: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    headers?: Record<string, string>;
  } = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    
    const config = {
      method: method.toLowerCase(),
      url: endpoint,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const response = await this.api.request(config);
    
    // Handle direct response (not wrapped in ApiResponse)
    if (response.data && typeof response.data === 'object' && 'transcript' in response.data) {
      return response.data as T;
    }
    
    // Handle wrapped response
    if (response.data?.success !== undefined) {
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Request failed');
      }
      return response.data.data as T;
    }
    
    return response.data as T;
  }
}

export const apiService = new ApiService();
