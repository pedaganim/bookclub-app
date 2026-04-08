/**
 * Simple cookie utility for managing auth tokens across subdomains.
 */

interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

export const setCookie = (name: string, value: string, options: CookieOptions = {}) => {
  const {
    days = 30,
    path = '/',
    domain = '',
    secure = true,
    sameSite = 'Lax',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${date.toUTCString()}`;
  }

  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += '; secure';
  }

  cookieString += `; samesite=${sameSite}`;

  document.cookie = cookieString;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};

export const eraseCookie = (name: string, domain = '') => {
  setCookie(name, '', { days: -1, domain });
};

/**
 * Returns the base domain for cookies (e.g., .booklub.shop)
 */
export const getBaseDomain = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    return '';
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Return the last two parts for .booklub.shop
    return `.${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }
  
  return '';
};
