import { searchWithPerplexity } from './perplexity';
import { searchWithSerper } from './serper';
import { summarizeWithOpenAI } from './openai';
import { fetchFromCustomSources } from './customSources';
import { ResearchResult, SearchResult, ApiError, PerplexityResponse, SerperSearchResult, SerperResponse, OpenAIResponse } from '../types';
import { formatSourcesWithTitles } from './api-utils';

/**
 * Main research function that combines results from multiple sources
 */
export async function research(query: string, customUrls: string[] = []): Promise<ResearchResult> {
  console.log(`Starting research for query: "${query}"`);
  console.log(`Custom URLs provided: ${customUrls.length}`);
  
  // Initialize variables to store results
  let perplexityResponse: PerplexityResponse | null = null;
  let serperResponse: SerperSearchResult | null = null;
  let openaiResponse: OpenAIResponse | null = null;
  let customSources: SearchResult[] = [];
  let answer = '';
  let errors: string[] = [];
  
  try {
    // Fetch data from custom sources (if provided)
    if (customUrls.length > 0) {
      console.log(`Fetching data from ${customUrls.length} custom URLs...`);
      try {
        const customResult = await fetchFromCustomSources(customUrls, query);
        customSources = customResult.sources;
        
        if (customResult.error) {
          console.warn(`Warning with custom sources: ${customResult.error}`);
          errors.push(`Custom sources warning: ${customResult.error}`);
        }
        
        console.log(`Successfully fetched data from ${customSources.length} custom URLs`);
        console.log(`Custom sources: ${JSON.stringify(customSources.map(s => ({ url: s.url, title: s.title })))}`);
      } catch (error) {
        console.error(`Error fetching custom sources: ${error instanceof Error ? error.message : String(error)}`);
        errors.push(`Error fetching custom sources: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('No custom URLs provided');
    }
    
    // Search with Perplexity
    console.log('Searching with Perplexity...');
    try {
      if (process.env.PERPLEXITY_API_KEY) {
        perplexityResponse = await searchWithPerplexity(query, process.env.PERPLEXITY_API_KEY);
        console.log(`Perplexity returned ${perplexityResponse.results.length} results`);
        
        // Log some details about the Perplexity results for debugging
        if (perplexityResponse.results.length > 0) {
          console.log(`Top Perplexity results: ${perplexityResponse.results.slice(0, 3).map(r => r.title).join(', ')}`);
        }
        
        if (perplexityResponse.answer) {
          console.log('Perplexity provided its own analysis which will be incorporated');
        }
      } else {
        console.warn('Perplexity API key not configured, skipping');
      }
    } catch (error) {
      console.error(`Error searching with Perplexity: ${error instanceof Error ? error.message : String(error)}`);
      errors.push(`Perplexity search error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Search with Serper
    console.log('Searching with Serper...');
    try {
      if (process.env.SERPER_API_KEY) {
        serperResponse = await searchWithSerper(query, process.env.SERPER_API_KEY);
        console.log(`Serper returned ${serperResponse.organic.length} organic results`);
      } else {
        console.warn('Serper API key not configured, skipping');
      }
    } catch (error) {
      console.error(`Error searching with Serper: ${error instanceof Error ? error.message : String(error)}`);
      errors.push(`Serper search error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Combine sources from all searches
    let allSources: SearchResult[] = [];
    
    // Add Perplexity sources
    if (perplexityResponse && perplexityResponse.results.length > 0) {
      allSources = [...allSources, ...perplexityResponse.results];
    }
    
    // Add Serper sources
    if (serperResponse && serperResponse.organic.length > 0) {
      const serperSources: SearchResult[] = serperResponse.organic.map(result => ({
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        source: 'serper',
        used: false
      }));
      allSources = [...allSources, ...serperSources];
    }
    
    // Add custom sources
    if (customSources.length > 0) {
      allSources = [...allSources, ...customSources];
    }
    
    // Check if we have any sources to work with
    if (allSources.length > 0) {
      console.log(`Total sources gathered: ${allSources.length}`);
      
      // Log breakdown of sources for monitoring balance
      const perplexityCount = perplexityResponse?.results.length || 0;
      const serperCount = serperResponse?.organic.length || 0;
      const customCount = customSources.length || 0;
      
      console.log(`Source breakdown - Perplexity: ${perplexityCount}, Serper: ${serperCount}, Custom: ${customCount}`);
      
      // Verify we have Perplexity sources if they should be available
      if (perplexityCount === 0 && process.env.PERPLEXITY_API_KEY) {
        console.warn('WARNING: No Perplexity sources were found despite API key being configured!');
      }
      
      try {
        if (process.env.OPENAI_API_KEY) {
          console.log('Generating summary with OpenAI with enhanced Perplexity integration...');
          
          // Ensure all sources have titles for proper citation
          const sourcesWithTitles = formatSourcesWithTitles(allSources);
          
          // Convert SerperSearchResult to SerperResponse for OpenAI
          const serperResponseForOpenAI: SerperResponse = {
            searchParameters: {
              q: query,
              gl: 'us',
              hl: 'en'
            },
            organic: serperResponse ? serperResponse.organic.map(item => ({
              title: item.title || 'Untitled',
              link: item.link,
              snippet: item.snippet || '',
              position: item.position || 0
            })) : []
          };
          
          openaiResponse = await summarizeWithOpenAI(
            query,
            perplexityResponse || { results: [], answer: '' },
            serperResponseForOpenAI,
            { sources: customSources },
            { 
              openaiApiKey: process.env.OPENAI_API_KEY,
              model: 'gpt-4o', 
              includeSourcesUsed: true
            }
          );
          answer = openaiResponse.answer;
          console.log('Successfully generated summary with OpenAI');
          
          // Mark sources as used based on OpenAI response
          if (openaiResponse) {
            const usedSourceUrls = openaiResponse.usedSourceUrls || [];
            allSources = allSources.map(source => ({
              ...source,
              used: source.url ? usedSourceUrls.includes(source.url) : false
            }));
            
            // Analyze source balance after OpenAI processing
            const usedPerplexitySources = allSources.filter(s => s.source === 'perplexity' && s.used).length;
            const usedSerperSources = allSources.filter(s => s.source === 'serper' && s.used).length;
            const usedCustomSources = allSources.filter(s => s.source === 'custom' && s.used).length;
            const totalUsedSources = usedPerplexitySources + usedSerperSources + usedCustomSources;
            
            console.log(`Sources actually used in answer - Perplexity: ${usedPerplexitySources}, Serper: ${usedSerperSources}, Custom: ${usedCustomSources}`);
            
            // Calculate percentages for better visibility
            if (totalUsedSources > 0) {
              const perplexityPercent = Math.round((usedPerplexitySources / totalUsedSources) * 100);
              const serperPercent = Math.round((usedSerperSources / totalUsedSources) * 100);
              const customPercent = Math.round((usedCustomSources / totalUsedSources) * 100);
              
              console.log(`Source distribution - Perplexity: ${perplexityPercent}%, Serper: ${serperPercent}%, Custom: ${customPercent}%`);
              
              // Check for balanced source distribution (should be close to 33% each or 50% each if only 2 types)
              const hasCustomSourcesAvailable = customSources.length > 0;
              const targetPercent = hasCustomSourcesAvailable ? 33 : 50;
              const threshold = 10; // Allow 10% deviation from target
              
              const isPerplexityBalanced = Math.abs(perplexityPercent - targetPercent) <= threshold;
              const isSerperBalanced = Math.abs(serperPercent - targetPercent) <= threshold;
              const isCustomBalanced = !hasCustomSourcesAvailable || Math.abs(customPercent - targetPercent) <= threshold;
              
              if (!isPerplexityBalanced || !isSerperBalanced || !isCustomBalanced) {
                console.warn('WARNING: Sources are not equally balanced in the answer!');
                let imbalanceNote = '';
                
                if (!isPerplexityBalanced) {
                  const direction = perplexityPercent < targetPercent ? "underrepresented" : "overrepresented";
                  imbalanceNote += `Perplexity sources (${perplexityPercent}%) are ${direction}. `;
                }
                
                if (!isSerperBalanced) {
                  const direction = serperPercent < targetPercent ? "underrepresented" : "overrepresented";
                  imbalanceNote += `Web search sources (${serperPercent}%) are ${direction}. `;
                }
                
                if (hasCustomSourcesAvailable && !isCustomBalanced) {
                  const direction = customPercent < targetPercent ? "underrepresented" : "overrepresented";
                  imbalanceNote += `Custom sources (${customPercent}%) are ${direction}.`;
                }
                
                // Add an imbalance note to the answer
                answer = `[NOTE: This answer may not have equal representation from all source types. ${imbalanceNote}]\n\n${answer}`;
              }
            }

            // Clean up any remaining HTML in the answer that might be from Perplexity
            const cleanAnswer = cleanHtmlFromPerplexity(answer);
            if (cleanAnswer !== answer) {
              console.log('HTML formatting detected and cleaned from the answer');
              answer = cleanAnswer;
            }
          }
        } else {
          throw new Error('OpenAI API key not configured');
        }
      } catch (error) {
        console.error(`Error summarizing with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
        errors.push(`OpenAI summary error: ${error instanceof Error ? error.message : String(error)}`);
        
        // If OpenAI fails, use Perplexity answer as fallback
        if (perplexityResponse && perplexityResponse.answer) {
          answer = `(OpenAI summarization failed, showing Perplexity answer as fallback)\n\n${perplexityResponse.answer}`;
          console.log('Using Perplexity answer as fallback');
        } else {
          answer = 'Failed to generate an answer from any source. Please try again or refine your query.';
        }
      }
    } else {
      answer = 'No search results found from any source. Please try a different query.';
      console.warn('No search results from any source');
    }
    
    // Create the final research result
    const result: ResearchResult = {
      query,
      answer: ensureProperMarkdownFormatting(answer),
      sources: allSources,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`Research completed for query: "${query}"`);
    return result;
    
  } catch (error) {
    console.error(`Unexpected error in research function: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return a minimal result with error information
    return {
      query,
      answer: `An error occurred while researching: ${error instanceof Error ? error.message : String(error)}`,
      sources: [],
      generatedAt: new Date().toISOString()
    };
  }
}

// Alias for backward compatibility
export const conductResearch = research;

/**
 * Helper function to clean HTML formatting from text that might come from Perplexity
 */
function cleanHtmlFromPerplexity(text: string): string {
  if (!text) return text;
  
  // Remove common HTML tags more aggressively
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
 * Ensures the final answer is properly formatted as clean Markdown
 */
function ensureProperMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // First, apply HTML cleaning to ensure no HTML remains
  let formattedText = cleanHtmlFromPerplexity(text);
  
  // Fix common Markdown formatting issues
  formattedText = formattedText
    // Ensure proper spacing around headings
    .replace(/^(#+.*?)(?:\n(?!\n))/gm, '$1\n\n')
    
    // Ensure proper list formatting
    .replace(/^(\s*[-*].*?)(?:\n(?!\n))/gm, '$1\n')
    .replace(/^(\s*\d+\..*?)(?:\n(?!\n))/gm, '$1\n')
    
    // Ensure proper spacing for paragraphs - any text not starting with #, -, *, number, or >
    .replace(/^([^#\-*\d>].*?)(?:\n(?!\n))/gm, '$1\n\n')
    
    // Fix broken links
    .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
    
    // Fix any URLs that aren't properly linked
    .replace(/(?<![(\[])(https?:\/\/[^\s,]+)(?![)\]])/g, '<$1>')
    
    // Fix spacing around blockquotes
    .replace(/^(>.*?)(?:\n(?!\n))/gm, '$1\n\n')
    
    // Fix tables - ensure proper formatting
    .replace(/\|\s*\n\s*\|/g, '|\n|')
    
    // Remove any non-standard characters that might cause display issues
    .replace(/[\u2028\u2029\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    
    // Ensure proper spacing between different content types
    .replace(/(\n\n\n+)/g, '\n\n')  // Replace 3+ consecutive line breaks with just 2
    .trim();
  
  // Ensure source sections are properly formatted
  if (formattedText.includes("SOURCES USED")) {
    formattedText = formattedText.replace(/(SOURCES\s*USED:?)/i, '\n\n## $1');
    
    // Format source subsections
    formattedText = formattedText
      .replace(/(Perplexity Sources:)/i, '### $1')
      .replace(/(Web Search Sources:)/i, '### $1')
      .replace(/(Custom Sources:)/i, '### $1');
  }
  
  return formattedText;
} 