import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book';
  canonicalUrl?: string;
  jsonLd?: Record<string, any>;
}

/**
 * SEO Component
 * Dynamically updates document head metadata for better search engine optimization and social sharing.
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image = '/logo512.png',
  url = window.location.href,
  type = 'website',
  canonicalUrl,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Update Document Title
    const fullTitle = title.includes('NearBorrow') ? title : `${title} — NearBorrow`;
    document.title = fullTitle;

    // 2. Helper to set meta tags
    const setMetaTag = (attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Meta Description
    setMetaTag('name', 'description', description);

    // 4. Update Open Graph Tags
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', url);
    if (image) {
      const absoluteImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMetaTag('property', 'og:image', absoluteImage);
    }

    // 5. Update Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    if (image) {
      const absoluteImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMetaTag('name', 'twitter:image', absoluteImage);
    }

    // 6. Handle Canonical URL
    if (canonicalUrl) {
      let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    // 7. Handle JSON-LD Structured Data
    if (jsonLd) {
      const scriptId = 'seo-json-ld';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(jsonLd);
    }

    // No explicit cleanup needed for title/meta as they will be updated by the next page's SEO component
    // However, for JSON-LD, we might want to clear it if the next page doesn't have it
    return () => {
      if (!jsonLd) {
        const script = document.getElementById('seo-json-ld');
        if (script) script.remove();
      }
    };
  }, [title, description, image, url, type, canonicalUrl, jsonLd]);

  return null; // This component doesn't render any UI
};

export default SEO;
