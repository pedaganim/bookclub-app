import axios from 'axios';
import { apiService } from '../../../../frontend/src/services/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock config
jest.mock('../../../../frontend/src/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3001'
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('authentication token handling', () => {
    it('should add idToken to request headers when available', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'idToken') return 'test-id-token';
        return null;
      });

      // Create a new instance to test interceptor
      const mockInstance = {
        interceptors: {
          request: {
            use: jest.fn((interceptor) => {
              // Test the interceptor function
              const config = { headers: {} };
              const result = interceptor(config);
              expect(result.headers.Authorization).toBe('Bearer test-id-token');
            })
          },
          response: {
            use: jest.fn()
          }
        }
      };

      mockedAxios.create.mockReturnValue(mockInstance as any);
      
      // Re-import to trigger constructor
      jest.isolateModules(() => {
        require('../../../../frontend/src/services/api');
      });
    });

    it('should add accessToken when idToken is not available', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'test-access-token';
        return null;
      });

      const mockInstance = {
        interceptors: {
          request: {
            use: jest.fn((interceptor) => {
              const config = { headers: {} };
              const result = interceptor(config);
              expect(result.headers.Authorization).toBe('Bearer test-access-token');
            })
          },
          response: {
            use: jest.fn()
          }
        }
      };

      mockedAxios.create.mockReturnValue(mockInstance as any);
      
      jest.isolateModules(() => {
        require('../../../../frontend/src/services/api');
      });
    });
  });
});