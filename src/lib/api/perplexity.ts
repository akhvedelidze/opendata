import axios from 'axios';
import { PerplexityResponse, ApiError, PerplexitySearchResult, SearchResult } from '../types';
import { SYSTEM_PROMPT } from './systemPrompts';
import { ensureSourceHasTitle } from './api-utils';

// Updated to the current API endpoint
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Fetches information from Perplexity AI API
 */
export async function fetchFromPerplexity(query: string): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw {
      message: 'Perplexity API key is not configured',
      statusCode: 500,
      source: 'perplexity'
    } as ApiError;
  }

  try {
    console.log(`Fetching from Perplexity using Sonar-Pro model with specialized system prompt`);
    // Updated request to match the new API format
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: "sonar-pro", // Using Sonar-Pro model which includes web search
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.3, // Using the specified temperature from the system prompt
        max_tokens: 1500,
        return_citations: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Process the response data to match our expected PerplexityResponse format
    const data = response.data;
    const answer = data.choices[0].message.content;
    
    // Extract search results/citations
    const results = data.citations ? 
      data.citations.map((url: string, index: number) => ({
        title: `Citation ${index + 1}`,
        url: url,
        snippet: "Source from Perplexity search",
        source: 'perplexity'
      })) : [];

    return {
      answer,
      query,
      results
    } as PerplexityResponse;
  } catch (error: any) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    
    throw {
      message: error.response?.data?.message || 'Failed to fetch data from Perplexity',
      statusCode: error.response?.status || 500,
      source: 'perplexity'
    } as ApiError;
  }
}

export async function searchWithPerplexity(query: string, perplexityApiKey: string): Promise<PerplexityResponse> {
  console.log(`Executing enhanced Perplexity search for query: "${query}"`);
  
  try {
    // First, try the new Perplexity search API which gives better structured results
    const searchResponse = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'query': query,
        'highlight': true,
        'web_search': true,
        'include_answer': true,
        'include_links': true,
        'max_results': 10  // Request more results to ensure comprehensive coverage
      })
    });
    
    if (!searchResponse.ok) {
      console.warn(`Perplexity search API returned status ${searchResponse.status}, falling back to chat API`);
      // If search API fails, fall back to the chat API
      return await fallbackToPerplexityChat(query, perplexityApiKey);
    }

    const data = await searchResponse.json() as PerplexitySearchResult;
    
    // Enhance the search results with better metadata
    const enhancedResults: SearchResult[] = (data.web_search.results || []).map((result, index) => {
      // Create a more descriptive title if missing
      const title = result.title || `Perplexity Result ${index + 1}`;
      
      // Combine extract and content for a more comprehensive snippet
      let snippet = '';
      if (result.extract) {
        snippet += cleanHtmlFromPerplexity(result.extract);
      }
      if (result.content && result.content !== result.extract) {
        snippet += (snippet ? '\n\n' : '') + cleanHtmlFromPerplexity(result.content);
      }
      
      // Format the snippet for better readability
      snippet = formatSnippetForReadability(snippet);
      
      return ensureSourceHasTitle({
        url: result.url,
        title: title,
        snippet: snippet,
        source: 'perplexity',
        priority: index < 3 ? 'high' : 'medium'  // Mark first results as high priority
      });
    });
    
    // If we have an AI answer from Perplexity, enhance it with source attributions
    let enhancedAnswer = data.answer || '';
    if (enhancedAnswer) {
      // Clean HTML from the Perplexity answer
      enhancedAnswer = cleanHtmlFromPerplexity(enhancedAnswer);
      enhancedAnswer = `## Perplexity AI Analysis\n\n${enhancedAnswer}\n\n*The above analysis was generated by Perplexity AI and enriched with web search results.*`;
    }
    
    // Log detailed information about the results
    console.log(`Perplexity search completed successfully with ${enhancedResults.length} results`);
    if (enhancedResults.length > 0) {
      console.log(`Top Perplexity result: "${enhancedResults[0].title}"`);
    }
    
    return {
      results: enhancedResults,
      answer: enhancedAnswer,
      query: query
    };
  } catch (error) {
    console.error('Error in Perplexity search:', error);
    // Still attempt to get some results via chat API if search fails
    return await fallbackToPerplexityChat(query, perplexityApiKey);
  }
}

// Fallback function to use Perplexity chat API if search API fails
async function fallbackToPerplexityChat(query: string, apiKey: string): Promise<PerplexityResponse> {
  console.log(`Falling back to Perplexity chat API for query: "${query}"`);
  
  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: "sonar-pro", // Using Sonar-Pro model which includes web search
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nIMPORTANT: Your response MUST include rich, detailed information with many facts, figures, and specific details. Include at least 5-10 different sources in your research. Prioritize authoritative and diverse sources. ALWAYS include your sources.`
          },
          {
            role: "user",
            content: `I need comprehensive information about: ${query}. Please research this thoroughly and provide detailed facts, data points, and insights from multiple sources. Include rich context and specific details.`
          }
        ],
        temperature: 0.1, // Lower temperature for more factual responses
        max_tokens: 2000, // Increased token count for more comprehensive answers
        return_citations: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Process the response data
    const data = response.data;
    const answer = data.choices[0].message.content;
    
    // Extract URLs from the answer text to use as citations
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const extractedUrls = answer.match(urlRegex) || [];
    
    // Extract citations from API response if available
    const apiCitations = data.citations || [];
    
    // Combine all unique URLs - using Array.from to avoid Set iteration issues
    const uniqueUrls = Array.from(new Set([...extractedUrls]));
    const allUrls = Array.from(new Set([...uniqueUrls, ...apiCitations]));
    
    // Generate search results from the URLs
    const search_results: SearchResult[] = allUrls.map((url, index) => {
      // Try to extract a title from the answer text around this URL
      const urlIndex = answer.indexOf(url as string);
      let contextTitle = `Perplexity Source ${index + 1}`;
      
      if (urlIndex !== -1) {
        // Look for text that might be a title near the URL
        const surroundingText = answer.substring(Math.max(0, urlIndex - 100), urlIndex);
        const titleMatch = surroundingText.match(/["']([^"']+)["']\s*$/);
        if (titleMatch) {
          contextTitle = titleMatch[1];
        }
      }
      
      return {
        title: contextTitle,
        url: url as string,
        snippet: "Source from Perplexity AI research",
        source: 'perplexity',
        priority: index < 3 ? 'high' : 'medium'  // Mark first results as high priority
      };
    });

    // Enhance the answer to highlight it's from Perplexity
    const enhancedAnswer = `## Perplexity AI Analysis\n\n${cleanHtmlFromPerplexity(answer)}\n\n*This comprehensive analysis was generated by Perplexity AI with integrated web search.*`;

    console.log(`Perplexity chat API returned ${search_results.length} sources`);
    
    return {
      results: search_results,
      answer: enhancedAnswer,
      query: query
    };
  } catch (error) {
    console.error('Perplexity chat API error:', error);
    
    // Return an empty response with an error message
    return {
      results: [],
      answer: '',
      query: query,
      error: `Failed to retrieve data from Perplexity: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Cleans HTML formatting from text and converts to proper Markdown
 */
function cleanHtmlFromPerplexity(text: string): string {
  if (!text) return text;
  
  // Remove common HTML tags more aggressively while preserving structure
  let cleanText = text
    // First, preserve important markdown structures before removing tags
    .replace(/\n\s*<li>/g, '\n* ')  // Convert HTML lists to markdown lists
    .replace(/<\/li>\s*\n?/g, '\n')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')  // Convert HTML headings to markdown
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')      // Preserve paragraph breaks
    
    // Handle table formatting
    .replace(/<table[^>]*>/gi, '\n\n')
    .replace(/<\/table>/gi, '\n\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, '| **$1** ')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ')
    .replace(/<\/tr>/gi, ' |')
    
    // Handle special formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    
    // Then remove remaining HTML tags
    .replace(/<\/?(?:div|span|br|hr|section|article|header|footer|nav|aside|figure|figcaption)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')  // Remove any other tags
    
    // Clean up HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&[a-z]+;/g, ' ');  // Remove any other HTML entities
  
  // Fix spacing issues that might result from HTML removal
  cleanText = cleanText
    .replace(/\s+/g, ' ')            // Replace multiple spaces with single space
    .replace(/\s\n/g, '\n')          // Remove space before newline
    .replace(/\n\s/g, '\n')          // Remove space after newline
    .replace(/\n{3,}/g, '\n\n')      // Replace 3+ consecutive newlines with just 2
    .replace(/\*\s+\*/g, '**')       // Fix broken bold formatting
    .replace(/\|\s+\|/g, '| |');     // Fix empty table cells
  
  // Special fixes for common formatting issues
  cleanText = cleanText
    // Fix broken lists
    .replace(/^\s*\*\s*([^*])/gm, '* $1')
    .replace(/^\s*-\s*([^-])/gm, '- $1')
    .replace(/^\s*\d+\.\s*([^.])/gm, '1. $1')
    
    // Fix broken headings
    .replace(/^#+\s*$/gm, '')
    .replace(/^#+([^#\s])/gm, '# $1')
    
    // Make sure paragraphs are separated by double newlines
    .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
    
    // Fix table formatting if present
    .replace(/\n\|\s*\n/g, '\n|\n')
    
    // Cleanup excess whitespace at beginning and end
    .trim();
    
  return cleanText;
}

/**
 * Format snippets for better readability
 */
function formatSnippetForReadability(snippet: string): string {
  if (!snippet) return '';
  
  // Format as markdown bullet points if it seems like a list
  const lines = snippet.split(/\.\s+/);
  if (lines.length >= 3 && lines.every(line => line.length < 100)) {
    return lines
      .filter(line => line.trim().length > 0)
      .map(line => `• ${line.trim()}${!line.endsWith('.') ? '.' : ''}`)
      .join('\n');
  }
  
  // Otherwise, format as paragraphs with reasonable length
  const formattedSnippet = snippet
    .replace(/([.!?])\s+/g, '$1\n\n') // Split into paragraphs at sentence boundaries
    .replace(/\n{3,}/g, '\n\n');      // Normalize paragraph spacing
    
  return formattedSnippet;
} 