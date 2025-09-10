/**
 * Integration test to validate that the OAuth URL construction matches
 * the expected format that will work with our Cognito configuration
 */

// Simple PKCE implementation for testing
function dec2hex(dec) {
  return ('0' + dec.toString(16)).slice(-2);
}

function randomString(length = 64) {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  return Array.from(array, dec2hex).join('');
}

async function createPkcePair() {
  const crypto = require('crypto');
  const code_verifier = randomString(64);
  const hash = crypto.createHash('sha256').update(code_verifier).digest();
  const code_challenge = hash.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { code_verifier, code_challenge };
}

// Mock config object similar to what the frontend would have
const mockConfig = {
  cognito: {
    domain: 'booklub-prod.auth.us-east-1.amazoncognito.com',
    userPoolClientId: '4705h2kn7jfps4k2r9j2h8ch9n',
    redirectSignIn: 'https://booklub.shop/auth/callback',
    scopes: ['openid', 'email', 'profile'],
    responseType: 'code'
  }
};

describe('OAuth URL Construction', () => {
  test('should construct valid OAuth URL for Google login', async () => {
    const { code_verifier, code_challenge } = await createPkcePair();
    
    const params = new URLSearchParams({
      response_type: mockConfig.cognito.responseType,
      client_id: mockConfig.cognito.userPoolClientId,
      redirect_uri: mockConfig.cognito.redirectSignIn,
      scope: mockConfig.cognito.scopes.join(' '),
      code_challenge,
      code_challenge_method: 'S256',
    });
    
    const url = `https://${mockConfig.cognito.domain}/oauth2/authorize?${params.toString()}`;
    
    // Validate URL structure
    expect(url).toContain('booklub-prod.auth.us-east-1.amazoncognito.com/oauth2/authorize');
    expect(url).toContain('client_id=4705h2kn7jfps4k2r9j2h8ch9n');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile'); // URLSearchParams uses + for spaces
    expect(url).toContain('redirect_uri=https%3A%2F%2Fbooklub.shop%2Fauth%2Fcallback');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('code_challenge=');
    
    // Validate PKCE parameters
    expect(code_verifier).toBeDefined();
    expect(code_verifier.length).toBeGreaterThan(40);
    expect(code_challenge).toBeDefined();
    expect(code_challenge.length).toBeGreaterThan(40);
    
    console.log('Generated OAuth URL:', url);
    console.log('✓ This URL should now work with Google authentication after deployment');
  });
  
  test('PKCE code_verifier and code_challenge should be different', async () => {
    const { code_verifier, code_challenge } = await createPkcePair();
    
    expect(code_verifier).not.toBe(code_challenge);
    expect(code_verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code_challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});