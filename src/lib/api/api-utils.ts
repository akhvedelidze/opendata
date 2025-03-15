import { SearchResult } from '../types';

/**
 * Utility functions for working with API data
 */

/**
 * Ensures that a source has a title, generating one from the URL if needed
 */
export function ensureSourceHasTitle(source: SearchResult): SearchResult {
  if (source.title && source.title.trim().length > 0) {
    return source;
  }
  
  // Generate a title from the URL if possible
  if (source.url) {
    try {
      const url = new URL(source.url);
      
      // Try to extract a meaningful title from the pathname
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPathPart = pathParts[pathParts.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, ''); // Remove file extension
        
        if (lastPathPart.length > 0) {
          // Capitalize first letter of each word
          const title = lastPathPart
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            ...source,
            title
          };
        }
      }
      
      // Use domain name if path doesn't work
      const domainTitle = url.hostname
        .replace(/^www\./, '')
        .split('.')
        .slice(0, -1)
        .join('.')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        ...source,
        title: domainTitle || 'Untitled Source'
      };
    } catch (error) {
      console.error('Error generating title from URL:', error);
    }
  }
  
  // Fallback title
  return {
    ...source,
    title: source.snippet 
      ? `Source: ${source.snippet.substring(0, 30)}...` 
      : 'Untitled Source'
  };
}

/**
 * Processes an array of sources to ensure they all have titles
 */
export function formatSourcesWithTitles(sources: SearchResult[]): SearchResult[] {
  return sources.map(source => ensureSourceHasTitle(source));
}

/**
 * Formats a citation string with title and URL
 */
export function formatCitation(source: SearchResult, index?: number): string {
  const title = source.title || 'Untitled Source';
  const url = source.url || '';
  const indexStr = typeof index === 'number' ? `[${index + 1}] ` : '';
  
  if (url) {
    return `${indexStr}"${title}" (${url})`;
  }
  
  return `${indexStr}"${title}"`;
}

/**
 * Extracts URLs from a string
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Validates a URL string
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  ensureSourceHasTitle,
  formatSourcesWithTitles,
  formatCitation,
  extractUrls,
  isValidUrl
}; 