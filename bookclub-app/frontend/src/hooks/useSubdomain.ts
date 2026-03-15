import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { BookClub } from '../types';

export interface SubdomainInfo {
  isSubdomain: boolean;
  slug: string | null;
  club: BookClub | null;
  isLoading: boolean;
  error: string | null;
}

export const useSubdomain = (): SubdomainInfo => {
  const [club, setClub] = useState<BookClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // For local development (localhost) or typical domains
    // e.g., fegentroad.booklub.shop -> fegentroad
    // e.g., localhost:3000 -> null
    // e.g., fegentroad.localhost -> fegentroad
    
    if (parts.length > 2) {
      // Check if first part is www (ignore as subplot)
      if (parts[0] === 'www') {
        return parts.length > 3 ? parts[1] : null;
      }
      return parts[0];
    }
    
    // Handle fegentroad.localhost
    if (hostname.includes('localhost') && parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0];
    }

    return null;
  }, []);

  useEffect(() => {
    const resolveClub = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const clubData = await apiService.resolveClubSlug(slug);
        setClub(clubData);
      } catch (err: any) {
        console.error('Error resolving subdomain:', err);
        setError(err.message || 'Failed to resolve club subdomain');
      } finally {
        setIsLoading(false);
      }
    };

    resolveClub();
  }, [slug]);

  return {
    isSubdomain: !!slug && !!club,
    slug,
    club,
    isLoading,
    error,
  };
};
