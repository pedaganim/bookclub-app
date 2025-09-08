import { createPkcePair } from '../../utils/pkce';

// Mock crypto.subtle for testing
const mockSubtle = {
  digest: jest.fn()
};

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: jest.fn()
};

// Mock btoa for base64 encoding
global.btoa = jest.fn();

// Mock TextEncoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn()
}));

describe('PKCE utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock crypto global
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true
    });

    // Mock window.crypto for the randomString function
    Object.defineProperty(window, 'crypto', {
      value: mockCrypto,
      writable: true
    });
  });

  describe('createPkcePair', () => {
    it('should generate PKCE pair with correct structure', async () => {
      // Mock the crypto functions
      const mockArrayBuffer = new ArrayBuffer(32);
      const mockUint8Array = new Uint8Array(mockArrayBuffer);
      
      mockCrypto.getRandomValues.mockImplementation((array) => {
        // Fill with predictable values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      });

      const mockEncoder = {
        encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
      };
      (TextEncoder as any).mockImplementation(() => mockEncoder);

      mockSubtle.digest.mockResolvedValue(mockArrayBuffer);
      (btoa as any).mockReturnValue('base64encodedstring==');

      const result = await createPkcePair();

      expect(result).toHaveProperty('code_verifier');
      expect(result).toHaveProperty('code_challenge');
      expect(typeof result.code_verifier).toBe('string');
      expect(typeof result.code_challenge).toBe('string');
      expect(result.code_verifier.length).toBe(128); // 64 bytes * 2 hex chars
    });

    it('should generate different values on subsequent calls', async () => {
      // Mock crypto functions with different values each time
      let callCount = 0;
      mockCrypto.getRandomValues.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + callCount) % 256;
        }
        callCount++;
        return array;
      });

      const mockEncoder = {
        encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
      };
      (TextEncoder as any).mockImplementation(() => mockEncoder);

      const mockArrayBuffer = new ArrayBuffer(32);
      mockSubtle.digest.mockResolvedValue(mockArrayBuffer);
      (btoa as any).mockReturnValue('base64encodedstring==');

      const result1 = await createPkcePair();
      const result2 = await createPkcePair();

      expect(result1.code_verifier).not.toBe(result2.code_verifier);
    });

    it('should properly encode challenge with URL-safe base64', async () => {
      mockCrypto.getRandomValues.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
        return array;
      });

      const mockEncoder = {
        encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
      };
      (TextEncoder as any).mockImplementation(() => mockEncoder);

      const mockArrayBuffer = new ArrayBuffer(32);
      mockSubtle.digest.mockResolvedValue(mockArrayBuffer);
      
      // Mock btoa to return something with + and / and = to test replacement
      (btoa as any).mockReturnValue('test+base64/string==');

      const result = await createPkcePair();

      expect(btoa).toHaveBeenCalled();
      expect(result.code_challenge).toBe('test-base64_string'); // + -> -, / -> _, = removed
    });

    it('should handle crypto API calls correctly', async () => {
      mockCrypto.getRandomValues.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 42;
        }
        return array;
      });

      const mockEncodedData = new Uint8Array([1, 2, 3, 4]);
      const mockEncoder = {
        encode: jest.fn().mockReturnValue(mockEncodedData)
      };
      (TextEncoder as any).mockImplementation(() => mockEncoder);

      const mockArrayBuffer = new ArrayBuffer(32);
      mockSubtle.digest.mockResolvedValue(mockArrayBuffer);
      (btoa as any).mockReturnValue('encoded');

      await createPkcePair();

      expect(mockEncoder.encode).toHaveBeenCalled();
      expect(mockSubtle.digest).toHaveBeenCalledWith('SHA-256', mockEncodedData);
    });
  });

  describe('fallback random generation', () => {
    it('should use Math.random when crypto.getRandomValues is not available', async () => {
      // Remove crypto.getRandomValues
      const cryptoWithoutGetRandomValues = {
        subtle: mockSubtle
      };
      
      Object.defineProperty(window, 'crypto', {
        value: cryptoWithoutGetRandomValues,
        writable: true
      });

      const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const mockEncoder = {
        encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
      };
      (TextEncoder as any).mockImplementation(() => mockEncoder);

      const mockArrayBuffer = new ArrayBuffer(32);
      mockSubtle.digest.mockResolvedValue(mockArrayBuffer);
      (btoa as any).mockReturnValue('encoded');

      const result = await createPkcePair();

      expect(mockMathRandom).toHaveBeenCalled();
      expect(result).toHaveProperty('code_verifier');
      expect(result).toHaveProperty('code_challenge');

      mockMathRandom.mockRestore();
    });
  });
});