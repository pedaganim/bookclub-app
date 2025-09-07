// PKCE utilities for Cognito Authorization Code Flow
// Generates a code_verifier and corresponding S256 code_challenge

function dec2hex(dec: number) {
  return ('0' + dec.toString(16)).slice(-2);
}

function randomString(length = 64): string {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, dec2hex).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer): string {
  let str = '';
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPkcePair() {
  const code_verifier = randomString(64);
  const hashed = await sha256(code_verifier);
  const code_challenge = base64urlencode(hashed);
  return { code_verifier, code_challenge } as const;
}
