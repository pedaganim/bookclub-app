const AWS = require('./aws-config');
const { getTableName } = require('./table-names');
const dynamoDb = require('./dynamodb');

class BookMetadataService {
  constructor() {
    this.cacheTable = 'metadata-cache'; // Will be handled by table-names.js
  }

  /**
   * Search for book metadata using various APIs
   * @param {Object} searchParams - ISBN, title, author, or combination
   * @returns {Promise<Object|null>} Book metadata or null if not found
   */
  async searchBookMetadata(searchParams) {
    const { isbn, title, author } = searchParams;
    try { console.log('[BookMetadata] searchBookMetadata input:', { isbn, title, author }); } catch (_) {}
    
    // Create a cache key based on search parameters
    const cacheKey = this.generateCacheKey(searchParams);
    
    try {
      // Check cache first
      const cachedResult = await this.getCachedMetadata(cacheKey);
      if (cachedResult) {
        console.log('[BookMetadata] Found cached result for:', cacheKey);
        return cachedResult.metadata;
      }

      // Try multiple search strategies
      let metadata = null;
      
      // Strategy 1: Search by ISBN if available (most accurate)
      if (isbn) {
        metadata = await this.searchByISBN(isbn);
      }
      
      // Strategy 2: Search by title and author if ISBN search fails
      if (!metadata && (title || author)) {
        metadata = await this.searchByTitleAuthor(title, author);
      }
      
      // Cache the result (even if null to avoid repeated API calls)
      await this.cacheMetadata(cacheKey, metadata);
      try {
        const summary = metadata ? {
          title: metadata.title,
          authors: Array.isArray(metadata.authors) ? metadata.authors.slice(0, 3) : metadata.authors,
          isbn10: metadata.isbn10,
          isbn13: metadata.isbn13,
          source: metadata.source,
        } : null;
        console.log('[BookMetadata] search result summary:', summary);
      } catch (_) {}
      
      return metadata;
    } catch (error) {
      console.error('[BookMetadata] Error searching metadata:', error);
      return null; // Graceful degradation
    }
  }

  /**
   * Search Google Books API by ISBN
   */
  async searchByISBN(isbn) {
    try {
      const cleanISBN = isbn.replace(/[^0-9X]/g, ''); // Clean ISBN
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`;
      try { console.log('[BookMetadata] Google ISBN URL:', url); } catch (_) {}
      
      const response = await this.makeHttpRequest(url);
      const data = JSON.parse(response);
      try { console.log('[BookMetadata] Google ISBN items count:', Array.isArray(data.items) ? data.items.length : 0); } catch (_) {}
      
      if (data.items && data.items.length > 0) {
        const parsed = this.parseGoogleBooksResponse(data.items[0]);
        try { console.log('[BookMetadata] Google ISBN parsed summary:', { title: parsed.title, authors: parsed.authors?.slice?.(0,3), isbn10: parsed.isbn10, isbn13: parsed.isbn13 }); } catch (_) {}
        return parsed;
      }
    } catch (error) {
      if (error.message.includes('Network access blocked') || error.message.includes('External API access not available')) {
        console.log('[BookMetadata] Google Books API not accessible in current environment');
      } else {
        console.error('[BookMetadata] Google Books ISBN search failed:', error);
      }
    }
    
    // Fallback to Open Library
    try {
      const cleanISBN = isbn.replace(/[^0-9X]/g, '');
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`;
      try { console.log('[BookMetadata] OpenLibrary ISBN URL:', url); } catch (_) {}
      
      const response = await this.makeHttpRequest(url);
      const data = JSON.parse(response);
      
      const bookKey = `ISBN:${cleanISBN}`;
      if (data[bookKey]) {
        const parsed = this.parseOpenLibraryResponse(data[bookKey]);
        try { console.log('[BookMetadata] OpenLibrary ISBN parsed summary:', { title: parsed.title, authors: parsed.authors?.slice?.(0,3), isbn10: parsed.isbn10, isbn13: parsed.isbn13 }); } catch (_) {}
        return parsed;
      }
    } catch (error) {
      if (error.message.includes('Network access blocked') || error.message.includes('External API access not available')) {
        console.log('[BookMetadata] Open Library API not accessible in current environment');
      } else {
        console.error('[BookMetadata] Open Library ISBN search failed:', error);
      }
    }
    
    return null;
  }

  /**
   * Search by title and author
   */
  async searchByTitleAuthor(title, author) {
    try {
      // Build search query
      let query = '';
      if (title) query += `intitle:${encodeURIComponent(title)}`;
      if (author) query += `${query ? '+' : ''}inauthor:${encodeURIComponent(author)}`;
      
      if (!query) return null;
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
      try { console.log('[BookMetadata] Google title/author URL:', url); } catch (_) {}
      
      const response = await this.makeHttpRequest(url);
      const data = JSON.parse(response);
      try { console.log('[BookMetadata] Google title/author items count:', Array.isArray(data.items) ? data.items.length : 0); } catch (_) {}
      
      if (data.items && data.items.length > 0) {
        const parsed = this.parseGoogleBooksResponse(data.items[0]);
        try { console.log('[BookMetadata] Google title/author parsed summary:', { title: parsed.title, authors: parsed.authors?.slice?.(0,3), isbn10: parsed.isbn10, isbn13: parsed.isbn13 }); } catch (_) {}
        return parsed;
      }
    } catch (error) {
      if (error.message.includes('Network access blocked') || error.message.includes('External API access not available')) {
        console.log('[BookMetadata] Google Books API not accessible in current environment');
      } else {
        console.error('[BookMetadata] Google Books title/author search failed:', error);
      }
    }

    // Fallback to Open Library search
    try {
      let searchUrl = 'https://openlibrary.org/search.json?';
      const params = [];
      if (title) params.push(`title=${encodeURIComponent(title)}`);
      if (author) params.push(`author=${encodeURIComponent(author)}`);
      params.push('limit=1');
      
      const url = searchUrl + params.join('&');
      try { console.log('[BookMetadata] OpenLibrary search URL:', url); } catch (_) {}
      
      const response = await this.makeHttpRequest(url);
      const data = JSON.parse(response);
      
      if (data.docs && data.docs.length > 0) {
        const parsed = this.parseOpenLibrarySearchResponse(data.docs[0]);
        try { console.log('[BookMetadata] OpenLibrary search parsed summary:', { title: parsed.title, authors: parsed.authors?.slice?.(0,3), isbn10: parsed.isbn10, isbn13: parsed.isbn13 }); } catch (_) {}
        return parsed;
      }
    } catch (error) {
      if (error.message.includes('Network access blocked') || error.message.includes('External API access not available')) {
        console.log('[BookMetadata] Open Library API not accessible in current environment');
      } else {
        console.error('[BookMetadata] Open Library search failed:', error);
      }
    }
    
    return null;
  }

  /**
   * Parse Google Books API response
   */
  parseGoogleBooksResponse(item) {
    const volumeInfo = item.volumeInfo || {};
    
    return {
      title: volumeInfo.title || null,
      authors: volumeInfo.authors || [],
      description: volumeInfo.description || null,
      publishedDate: volumeInfo.publishedDate || null,
      pageCount: volumeInfo.pageCount || null,
      categories: volumeInfo.categories || [],
      language: volumeInfo.language || null,
      isbn10: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_10'),
      isbn13: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_13'),
      thumbnail: volumeInfo.imageLinks?.thumbnail || null,
      smallThumbnail: volumeInfo.imageLinks?.smallThumbnail || null,
      publisher: volumeInfo.publisher || null,
      source: 'google_books'
    };
  }

  /**
   * Parse Open Library response
   */
  parseOpenLibraryResponse(book) {
    return {
      title: book.title || null,
      authors: book.authors ? book.authors.map(a => a.name) : [],
      description: book.notes || book.description || null,
      publishedDate: book.publish_date || null,
      pageCount: book.number_of_pages || null,
      categories: book.subjects ? book.subjects.map(s => s.name) : [],
      language: null, // Not easily available in Open Library API
      isbn10: this.extractOpenLibraryISBN(book.identifiers, 'isbn_10'),
      isbn13: this.extractOpenLibraryISBN(book.identifiers, 'isbn_13'),
      thumbnail: book.cover ? book.cover.medium : null,
      smallThumbnail: book.cover ? book.cover.small : null,
      publisher: book.publishers ? book.publishers[0].name : null,
      source: 'open_library'
    };
  }

  /**
   * Parse Open Library search response
   */
  parseOpenLibrarySearchResponse(doc) {
    return {
      title: doc.title || null,
      authors: doc.author_name || [],
      description: null, // Not available in search results
      publishedDate: doc.first_publish_year ? doc.first_publish_year.toString() : null,
      pageCount: null, // Not available in search results
      categories: doc.subject || [],
      language: doc.language ? doc.language[0] : null,
      isbn10: doc.isbn ? doc.isbn.find(isbn => isbn.length === 10) : null,
      isbn13: doc.isbn ? doc.isbn.find(isbn => isbn.length === 13) : null,
      thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      smallThumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg` : null,
      publisher: doc.publisher ? doc.publisher[0] : null,
      source: 'open_library_search'
    };
  }

  /**
   * Extract ISBN from Google Books industry identifiers
   */
  extractISBN(identifiers, type) {
    if (!identifiers) return null;
    const identifier = identifiers.find(id => id.type === type);
    return identifier ? identifier.identifier : null;
  }

  /**
   * Extract ISBN from Open Library identifiers
   */
  extractOpenLibraryISBN(identifiers, type) {
    if (!identifiers || !identifiers[type]) return null;
    return identifiers[type][0] || null;
  }

  /**
   * Generate cache key for search parameters
   */
  generateCacheKey(searchParams) {
    const { isbn, title, author } = searchParams;
    
    if (isbn) {
      return `isbn:${isbn.replace(/[^0-9X]/g, '')}`;
    }
    
    const parts = [];
    if (title) parts.push(`title:${title.toLowerCase().trim()}`);
    if (author) parts.push(`author:${author.toLowerCase().trim()}`);
    
    return parts.join('|');
  }

  /**
   * Get cached metadata
   */
  async getCachedMetadata(cacheKey) {
    try {
      // Skip caching in sandboxed environments
      if (!this.isExternalAccessAvailable()) {
        console.log('[BookMetadata] Skipping cache lookup in sandboxed environment');
        return null;
      }

      // For now, we'll add the cache table to the existing table-names.js
      // and use DynamoDB for caching
      const result = await dynamoDb.get(getTableName('metadata-cache'), { cacheKey });
      
      if (result) {
        const ageInHours = (Date.now() - new Date(result.cachedAt).getTime()) / (1000 * 60 * 60);
        // Cache for 24 hours
        if (ageInHours < 24) {
          return result;
        }
      }
    } catch (error) {
      if (error.code === 'ConfigError' || error.message.includes('Missing region')) {
        console.log('[BookMetadata] AWS not configured, skipping cache lookup');
      } else {
        console.error('[BookMetadata] Error getting cached metadata:', error);
      }
    }
    
    return null;
  }

  /**
   * Cache metadata
   */
  async cacheMetadata(cacheKey, metadata) {
    try {
      // Skip caching in sandboxed environments
      if (!this.isExternalAccessAvailable()) {
        console.log('[BookMetadata] Skipping cache storage in sandboxed environment');
        return;
      }

      const now = Date.now();
      const cacheItem = {
        cacheKey,
        metadata,
        cachedAt: new Date().toISOString(),
        // TTL: cache for 24 hours (in Unix timestamp seconds)
        ttl: Math.floor(now / 1000) + (24 * 60 * 60)
      };
      
      await dynamoDb.put(getTableName('metadata-cache'), cacheItem);
    } catch (error) {
      if (error.code === 'ConfigError' || error.message.includes('Missing region')) {
        console.log('[BookMetadata] AWS not configured, skipping cache storage');
      } else {
        console.error('[BookMetadata] Error caching metadata:', error);
      }
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Check if external API access is available (for sandboxed environments)
   */
  isExternalAccessAvailable() {
    // Check for common indicators of sandboxed environments
    const isSandboxed = process.env.NODE_ENV === 'test' || 
                       process.env.GITHUB_ACTIONS === 'true' ||
                       process.env.CI === 'true';
    
    return !isSandboxed;
  }

  /**
   * Simple HTTP request helper (using Node.js built-in modules)
   */
  async makeHttpRequest(url) {
    // Quick check for sandboxed environment to avoid DNS errors
    if (!this.isExternalAccessAvailable()) {
      console.log('[BookMetadata] Skipping external API call in sandboxed environment:', url);
      throw new Error('External API access not available in current environment');
    }

    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'BookClub-App/1.0'
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });
      
      req.on('error', (error) => {
        // Enhanced error handling for DNS and network issues
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.log('[BookMetadata] DNS/Network error, likely in sandboxed environment:', error.code);
          reject(new Error(`Network access blocked: ${error.code}`));
        } else {
          reject(error);
        }
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }
}

module.exports = new BookMetadataService();