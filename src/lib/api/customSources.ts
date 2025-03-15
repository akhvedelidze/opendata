import axios from 'axios';
import { SearchResult, ApiError } from '../types';

// Attempt to import jsdom and readability, but handle gracefully if not available
let JSDOM: any;
let Readability: any;
try {
  // Try to import JSDOM dynamically
  JSDOM = require('jsdom').JSDOM;
  Readability = require('@mozilla/readability').Readability;
  console.log('Enhanced HTML parsing available with JSDOM and Readability');
} catch (e) {
  console.log('JSDOM and Readability not available, using fallback HTML parsing');
  JSDOM = null;
  Readability = null;
}

// Regular expression to extract main content - crude but functional for many sites
const CONTENT_REGEX = /<body[^>]*>([\s\S]*?)<\/body>/i;
// RegEx to strip HTML tags
const HTML_TAGS_REGEX = /<[^>]*>/g;

interface CustomSourceResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Fetches content from a specific URL using direct requests with multiple fallback strategies
 */
export async function fetchFromUrl(url: string): Promise<CustomSourceResult | null> {
  try {
    console.log(`Attempting to fetch custom URL: ${url}`);
    
    // Validate URL format
    if (!isValidUrl(url)) {
      console.error(`Invalid URL format: ${url}`);
      return null;
    }

    // Configure axios for the request with appropriate headers
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 15000, // 15 second timeout
      maxContentLength: 10 * 1024 * 1024, // Limit to 10MB
    };

    console.log(`Fetching HTML content from: ${url}`);
    const response = await axios.get(url, config);
    
    if (response.status !== 200) {
      console.error(`Error fetching URL ${url}: Status ${response.status}`);
      return null;
    }

    const html = response.data;
    if (!html || typeof html !== 'string') {
      console.error(`No HTML content received from ${url}`);
      return null;
    }

    console.log(`Successfully fetched HTML from ${url}, size: ${html.length} bytes`);
    
    // Multiple extraction strategies - ordered by quality of extraction
    let title = '';
    let content = '';
    
    // Strategy 1: Use Mozilla's Readability if available (best for articles)
    if (JSDOM && Readability) {
      try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (article && article.content && article.content.length > 200) {
          console.log(`Successfully extracted article with Readability from: ${url}`);
          title = article.title || '';
          content = article.content;
          
          // Clean the content from remaining HTML tags
          content = cleanHtml(content);
          
          if (content.length > 300) {
            return {
              title: title.trim() || extractTitleFromHtml(html) || url,
              url,
              content: content.trim()
            };
          }
        }
      } catch (readabilityError) {
        console.warn(`Readability extraction failed for ${url}:`, readabilityError);
      }
    }
    
    // Strategy 2: Extract structured data if available (JSON-LD, microdata)
    const structuredData = extractStructuredData(html);
    if (structuredData) {
      console.log(`Extracted structured data from ${url}`);
      return structuredData;
    }
    
    // Strategy 3: Extract main content manually using patterns
    content = extractMainContent(html);
    title = extractTitleFromHtml(html) || url;
    
    if (content && content.length > 300) {
      console.log(`Extracted content using pattern matching from ${url}, length: ${content.length}`);
      
      // Truncate to reasonable length while preserving complete sentences
      if (content.length > 15000) {
        content = truncatePreservingSentences(content, 15000);
      }
      
      return {
        title: title.trim(),
        url,
        content: content.trim()
      };
    }
    
    // Strategy 4: Last resort, extract all text content
    content = extractAllText(html);
    if (content && content.length > 200) {
      console.log(`Extracted all text content from ${url}, length: ${content.length}`);
      return {
        title: title || url,
        url,
        content: content.trim()
      };
    }
    
    console.warn(`No meaningful content could be extracted from ${url}`);
    return null;
  } catch (error: any) {
    console.error(`Error fetching URL ${url}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Headers:`, error.response.headers);
    }
    console.error(`Stack trace:`, error.stack);
    return null;
  }
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Extracts the title from HTML
 */
function extractTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  
  // Alternative title extraction
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return cleanHtml(h1Match[1]).trim();
  }
  
  return '';
}

/**
 * Extracts structured data from HTML (JSON-LD, microdata)
 */
function extractStructuredData(html: string): CustomSourceResult | null {
  try {
    // Look for JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        // Handle JSON-LD array
        const jsonLdObject = Array.isArray(data) ? data[0] : data;
        
        if (jsonLdObject) {
          let content = '';
          let title = '';
          
          // Extract title
          title = jsonLdObject.headline || 
                 jsonLdObject.name || 
                 jsonLdObject.title || '';
                 
          // Extract content
          content = jsonLdObject.articleBody || 
                   jsonLdObject.description || 
                   jsonLdObject.text || '';
          
          if (title && content && content.length > 200) {
            return {
              title: title.trim(),
              url: jsonLdObject.url || '',
              content: content.trim()
            };
          }
        }
      } catch (e) {
        console.warn('Error parsing JSON-LD:', e);
      }
    }
    
    return null;
  } catch (e) {
    console.warn('Error extracting structured data:', e);
    return null;
  }
}

/**
 * Extracts the main content from HTML using multiple strategies
 */
function extractMainContent(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Try to identify and extract the main content
  // Strategy 1: Look for common article content containers
  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*(?:article|post|content|entry|blog)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*id=["'](?:article|post|content|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ];
  
  for (const pattern of articlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Clean the extracted content
      const cleaned = cleanHtml(match[1]);
      // If we got substantial content, return it
      if (cleaned.length > 300) {
        return cleaned;
      }
    }
  }
  
  // Strategy 2: Extract paragraph text from the entire body
  const paragraphs: string[] = [];
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let paragraphMatch;
  
  while ((paragraphMatch = paragraphRegex.exec(html)) !== null) {
    if (paragraphMatch[1]) {
      const text = cleanHtml(paragraphMatch[1]);
      if (text.length > 20) {
        paragraphs.push(text);
      }
    }
  }
  
  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }
  
  // Strategy 3: Fallback to body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return cleanHtml(bodyMatch[1]);
  }
  
  return '';
}

/**
 * Extracts all visible text content from the HTML
 */
function extractAllText(html: string): string {
  if (typeof html !== 'string') return '';
  
  // If JSDOM is available, use it for better text extraction
  if (JSDOM) {
    try {
      // Remove script, style and other non-content elements
      let processedHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ');
      
      const dom = new JSDOM(processedHtml);
      const textContent = dom.window.document.body?.textContent || '';
      return textContent
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      console.warn('Error extracting all text with JSDOM:', e);
    }
  }
  
  // Fallback to regex-based extraction
  try {
    // First remove specific elements we don't want
    let cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ');
    
    // Then extract text from all remaining tags
    let textContent = '';
    const textExtractor = />([^<]+)</g;
    let textMatch;
    
    while ((textMatch = textExtractor.exec(cleanedHtml)) !== null) {
      if (textMatch[1] && textMatch[1].trim()) {
        textContent += ' ' + textMatch[1].trim();
      }
    }
    
    return textContent
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.warn('Error with fallback text extraction:', e);
    // Last resort: use simple clean
    return cleanHtml(html);
  }
}

/**
 * Cleans HTML content by removing tags, scripts, styles, etc.
 */
function cleanHtml(html: string): string {
  // Remove script and style sections
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')  // Replace non-breaking spaces
    .replace(/&lt;/g, '<')    // Replace HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')     // Consolidate whitespace
    .trim();
    
  return cleaned;
}

/**
 * Truncates text to the specified length while preserving complete sentences
 */
function truncatePreservingSentences(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find a sentence boundary near the maxLength
  const truncated = text.substring(0, maxLength);
  
  // Look for sentence ending punctuation (., !, ?) followed by a space or end of string
  const sentenceEndRegex = /[.!?](\s|$)/g;
  
  let lastMatch = null;
  let match;
  
  // Find the last sentence boundary in the truncated text
  while ((match = sentenceEndRegex.exec(truncated)) !== null) {
    lastMatch = match;
  }
  
  if (lastMatch && lastMatch.index > maxLength * 0.5) {
    return truncated.substring(0, lastMatch.index + 1);
  }
  
  // If no good sentence boundary found, try to break at a paragraph
  const lastParagraph = truncated.lastIndexOf('\n\n');
  if (lastParagraph > maxLength * 0.5) {
    return truncated.substring(0, lastParagraph);
  }
  
  // Fall back to breaking at the maxLength
  return truncated + '...';
}

/**
 * Fetches content from a single URL
 */
async function fetchSingleUrl(url: string, query?: string): Promise<SearchResult | null> {
  try {
    console.log(`Fetching content from URL: ${url}`);
    
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }
    
    // Use the existing fetchFromUrl function
    const result = await fetchFromUrl(url);
    
    if (!result) {
      console.warn(`No content extracted from ${url}`);
      return null;
    }
    
    // Create snippet
    const snippet = result.content.length > 300 
      ? result.content.substring(0, 300) + '...' 
      : result.content;
    
    console.log(`Successfully processed ${url}: title="${result.title}", content length=${result.content.length}`);
    
    return {
      url,
      title: result.title,
      snippet,
      content: result.content,
      source: 'custom',
      used: false
    };
  } catch (error) {
    console.error(`Error fetching ${url}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Fetches content from a list of URLs and processes it for research
 */
export async function fetchFromCustomSources(urls: string[], query?: string): Promise<{ sources: SearchResult[], error?: string }> {
  console.log(`Fetching content from ${urls.length} custom URLs`);
  
  if (urls.length === 0) {
    return { sources: [], error: 'No custom URLs provided' };
  }
  
  // Validate all URLs first
  const invalidUrls: string[] = [];
  urls.forEach(url => {
    if (!isValidUrl(url)) {
      invalidUrls.push(url);
    }
  });
  
  if (invalidUrls.length > 0) {
    const errorMsg = `Invalid URLs detected: ${invalidUrls.join(', ')}`;
    console.error(errorMsg);
    return { 
      sources: [], 
      error: errorMsg 
    };
  }
  
  // Filter out duplicates
  const uniqueUrls = Array.from(new Set(urls));
  
  // Fetch content from all URLs in parallel
  const promises = uniqueUrls.map(url => fetchSingleUrl(url, query));
  const results = await Promise.allSettled(promises);
  
  // Process results
  const sources: SearchResult[] = [];
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    const url = uniqueUrls[index];
    
    if (result.status === 'fulfilled') {
      const source = result.value;
      if (source) {
        sources.push(source);
      }
    } else {
      const errorMsg = `Failed to fetch content from ${url}: ${result.reason}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  });
  
  console.log(`Successfully fetched content from ${sources.length} of ${uniqueUrls.length} URLs`);
  
  // Return results with error summary if needed
  if (errors.length > 0) {
    return {
      sources,
      error: `Failed to fetch content from ${errors.length} URLs: ${errors.join('; ')}`
    };
  }
  
  return { sources };
}

/**
 * Creates a snippet from longer content
 */
function createSnippet(content: string, maxLength: number = 300): string {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  
  return truncatePreservingSentences(content, maxLength);
}

/**
 * Process a batch of URLs with limited concurrency
 */
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R | null>
): Promise<PromiseSettledResult<R | null>[]> {
  const results: PromiseSettledResult<R | null>[] = [];
  
  // Process in smaller batches to limit concurrency
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => fn(item));
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
} 