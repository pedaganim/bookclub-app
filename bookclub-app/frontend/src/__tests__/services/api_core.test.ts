import axios from 'axios';

// Mock axios BEFORE importing apiService
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };
  return {
    create: jest.fn(() => mockInstance),
    defaults: { adapter: {} }
  };
});

import { apiService } from '../../services/api';

describe('ApiService Core Methods', () => {
  const clubId = 'test-club-id';
  const userId = 'test-user-id';
  const apiInstance = (apiService as any).api;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Member Management', () => {
    it('listMembers handles success', async () => {
      const mockData = { success: true, data: { items: [{ userId: 'u1' }] } };
      apiInstance.get.mockResolvedValue({ data: mockData });

      const result = await apiService.listMembers(clubId);
      expect(result).toEqual(mockData.data);
      expect(apiInstance.get).toHaveBeenCalledWith(`/clubs/${clubId}/members`);
    });

    it('listMembers handles failure', async () => {
      const mockError = { success: false, error: { message: 'Failed' } };
      apiInstance.get.mockResolvedValue({ data: mockError });

      await expect(apiService.listMembers(clubId)).rejects.toThrow('Failed');
    });

    it('removeMember handles success', async () => {
      const mockData = { success: true };
      apiInstance.delete.mockResolvedValue({ data: mockData });

      await apiService.removeMember(clubId, userId);
      expect(apiInstance.delete).toHaveBeenCalledWith(`/clubs/${clubId}/members/${userId}`);
    });

    it('updateMemberRole handles success', async () => {
      const mockData = { success: true };
      apiInstance.patch.mockResolvedValue({ data: mockData });

      await apiService.updateMemberRole(clubId, userId, 'admin');
      expect(apiInstance.patch).toHaveBeenCalledWith(`/clubs/${clubId}/members/${userId}/role`, { role: 'admin' });
    });
  });

  describe('Join Requests', () => {
    it('listJoinRequests handles success', async () => {
      const mockData = { success: true, data: { items: [] } };
      apiInstance.get.mockResolvedValue({ data: mockData });

      const result = await apiService.listJoinRequests(clubId);
      expect(result).toEqual(mockData.data);
      expect(apiInstance.get).toHaveBeenCalledWith(`/clubs/${clubId}/requests`);
    });

    it('approveJoinRequest handles success', async () => {
      const mockData = { success: true, data: { approved: true } };
      apiInstance.post.mockResolvedValue({ data: mockData });

      await apiService.approveJoinRequest(clubId, userId);
      expect(apiInstance.post).toHaveBeenCalledWith(`/clubs/${clubId}/requests/${userId}/approve`);
    });

    it('rejectJoinRequest handles success', async () => {
      const mockData = { success: true, data: { rejected: true } };
      apiInstance.post.mockResolvedValue({ data: mockData });

      await apiService.rejectJoinRequest(clubId, userId);
      expect(apiInstance.post).toHaveBeenCalledWith(`/clubs/${clubId}/requests/${userId}/reject`);
    });
  });

  describe('Generic request method branches', () => {
    it('handles direct response with transcript (voice search)', async () => {
      const mockData = { transcript: 'test hello' };
      apiInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      const result = await apiService.request('/voice-search');
      expect(result).toEqual(mockData);
    });

    it('handles wrapped response success', async () => {
      const mockData = { success: true, data: { result: 'ok' } };
      apiInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      const result = await apiService.request('/test');
      expect(result).toEqual(mockData.data);
    });

    it('handles wrapped response failure', async () => {
      const mockData = { success: false, error: { message: 'Api Error' } };
      apiInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      await expect(apiService.request('/test')).rejects.toThrow('Api Error');
    });

    it('handles direct response (no success field)', async () => {
      const mockData = { some: 'data' };
      apiInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      const result = await apiService.request('/test');
      expect(result).toEqual(mockData);
    });
  });
});
