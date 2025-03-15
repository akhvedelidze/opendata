import axios from 'axios';
import { OpenAIResponse, ApiError, PerplexityResponse, SerperResponse, SearchResult } from '../types';
import { OPENAI_SYSTEM_PROMPT } from './systemPrompts';
import { formatSourcesWithTitles, formatCitation } from './api-utils';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Interface for custom sources data
interface CustomSourcesData {
  sources: SearchResult[];
  error?: string;
}

/**
 * Summarizes data from Perplexity, Serper and custom sources using OpenAI
 * With enhanced integration of Perplexity results
 */
export async function summarizeWithOpenAI(
  query: string,
  perplexityData: { results: SearchResult[]; answer: string },
  serperData: SerperResponse,
  customSourcesData: CustomSourcesData,
  options: { openaiApiKey: string; model?: string; includeSourcesUsed?: boolean }
): Promise<OpenAIResponse> {
  console.log(`OpenAI summarization started for query: "${query}"`);
  console.log(`Perplexity sources available: ${perplexityData.results.length}`);
  console.log(`Custom sources available: ${customSourcesData.sources.length}`);
  console.log('Using enhanced integration for Perplexity sources');
  
  try {
    // Format perplexity results with proper titles for citation
    const perplexityResults = formatSourcesWithTitles(perplexityData.results);
    
    // Process serper results to ensure they have titles
    const serperResults = formatSourcesWithTitles(
      serperData.organic.map((result) => ({
        url: result.link,
        title: result.title || '',
        snippet: result.snippet || '',
        source: 'serper',
      }))
    );

    // Process custom sources to ensure they have titles
    const customSources = formatSourcesWithTitles(customSourcesData.sources);

    // Pre-select high priority Perplexity results to ensure they're included
    const priorityPerplexitySources = perplexityResults
      .filter(source => source.priority === 'high' || !source.priority)
      .slice(0, Math.min(3, perplexityResults.length));
    
    // Mark these sources specifically for tracking
    const prioritySourceUrls = priorityPerplexitySources.map(s => s.url);
    
    // Format perplexity context with titles, with enhanced prominence
    const perplexityContext = perplexityResults.length
      ? `PERPLEXITY SEARCH RESULTS (CRITICAL SOURCE - MUST BE PROMINENTLY FEATURED):
${perplexityResults
  .map((result, i) => {
    const isPriority = result.url && prioritySourceUrls.includes(result.url);
    return `[${i + 1}] "${result.title || 'No Title'}" (${result.url || 'No URL'})${isPriority ? ' [HIGH PRIORITY]' : ''}
${result.snippet || ''}`;
  })
  .join('\n\n')}`
      : 'NO PERPLEXITY RESULTS AVAILABLE';

    // Include Perplexity's direct answer if available
    const perplexityAnswer = perplexityData.answer 
      ? `\n\nPERPLEXITY AI ANALYSIS (MUST BE INCORPORATED):
${perplexityData.answer}`
      : '';

    // Add Perplexity answer to the context
    const enhancedPerplexityContext = perplexityAnswer 
      ? `${perplexityContext}${perplexityAnswer}` 
      : perplexityContext;

    // Format serper context with titles
    const serperContext = serperResults.length
      ? `WEB SEARCH RESULTS:
${serperResults
  .map((result, i) => `[${i + 1}] "${result.title || 'No Title'}" (${result.url || 'No URL'})
${result.snippet || ''}`)
  .join('\n\n')}`
      : '';

    // Format custom sources context with titles
    const customSourcesContext = customSources.length
      ? `CUSTOM SOURCES:
${customSources
  .map((source, i) => `[${i + 1}] "${source.title || 'No Title'}" (${source.url || 'No URL'})
${source.content || source.snippet || ''}`)
  .join('\n\n')}`
      : '';

    // Track which URLs were actually used in the answer
    const allSources = [...perplexityResults, ...serperResults, ...customSources];
    
    // Include a section for sources used in the completion
    const sourcesUsedInstruction = options.includeSourcesUsed
      ? `
At the end of your response, include a "SOURCES USED" section with three distinct subsections in this EXACT format:
SOURCES USED:
Perplexity Sources:
1. "[Title]" (URL)
2. "[Title]" (URL)
...

Web Search Sources:
1. "[Title]" (URL)
2. "[Title]" (URL)
...

Custom Sources:
1. "[Title]" (URL)
2. "[Title]" (URL)
...

IMPORTANT: You MUST include at least one source from each category (if available). The total number of Perplexity sources used should be AT LEAST equal to the number of other sources.`
      : '';

    // Enhanced system prompt with balance instruction and source tracking
    const systemMessage = `${OPENAI_SYSTEM_PROMPT}${sourcesUsedInstruction}`;

    // Make the API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: options.model || 'gpt-4o',
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: `Answer the following query comprehensively: "${query}"

SOURCES PROVIDED:
=== PERPLEXITY SEARCH RESULTS ===
${enhancedPerplexityContext}

=== WEB SEARCH RESULTS ===
${serperContext}

=== CUSTOM SOURCES ===
${customSourcesContext}

CRITICAL FORMATTING REQUIREMENTS:
1. USE ONLY PURE MARKDOWN - NO HTML TAGS OR ENTITIES: Do not include any HTML such as <p>, <div>, <br>, &nbsp;, etc.
2. USE PROPER PARAGRAPH SPACING: Separate paragraphs with blank lines.
3. USE PROPER HEADING SYNTAX: Use # for main headings, ## for sections, ### for subsections.
4. USE PROPER LIST SYNTAX: Use * or - for bullet points, and numbers for ordered lists.
5. FORMAT TABLES PROPERLY: Use markdown table syntax with pipes and dashes.
6. FORMAT LINKS PROPERLY: Use [text](URL) format for all links.

CONTENT REQUIREMENTS:
1. MANDATORY EQUAL BALANCE: Include information from ALL available source types in EXACTLY equal proportions (33.3% each, or 50-50 if only two are available)
2. BEGIN WITH SUMMARY: Start with a 1-2 paragraph executive summary answering the query directly
3. INCLUDE TABLE OF CONTENTS: For long answers, add a linked table of contents
4. ORGANIZE BY TOPIC: Structure by topic, not by source type
5. CITE EVERY FACT: Include a citation for every piece of information in the format "[Source Title] (URL)"
6. PRESENT BALANCED VIEWS: When sources conflict, present ALL perspectives equally

Your response MUST be in clean, properly formatted Markdown only. Avoid all HTML formatting, especially from Perplexity sources.

Conclude with a "SOURCES USED" section listing ALL sources referenced, organized by source type, with an equal number from each available category.`
          }
        ],
        temperature: 0.1, // Lower temperature for more reliable source inclusion and formatting
        max_tokens: 1500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.openaiApiKey}`
        }
      }
    );

    // Axios handles error status codes by throwing
    // so if we get here, the request was successful
    const data = response.data;
    const content = data.choices[0]?.message?.content || '';
    
    // Extract used sources from the SOURCES_USED section
    let usedSourceUrls: (string | undefined)[] = [];
    const sourcesSection = content.match(/SOURCES\s*USED:([\s\S]*?)(?:\n\n|\n$|$)/);
    if (sourcesSection) {
      const sourcesList = sourcesSection[1].split('\n');
      // Extract URLs from the list items
      sourcesList.forEach((item: string) => {
        const urlMatch = item.match(/\(([^)]+)\)/);
        if (urlMatch && urlMatch[1]) {
          usedSourceUrls.push(urlMatch[1]);
        }
      });
      console.log(`Extracted ${usedSourceUrls.length} used source URLs from SOURCES_USED section`);
    } else {
      console.log('No SOURCES_USED section found in the response, assuming all sources might be used');
      // If no sources section found, collect all possible URLs as potentially used
      usedSourceUrls = allSources.map(source => source.url);
    }
    
    // Check if Perplexity sources are used
    const usedPerplexitySources = perplexityResults.filter(s => s.url && usedSourceUrls.includes(s.url)).length;
    console.log(`Number of Perplexity sources used: ${usedPerplexitySources}`);
    
    if (usedPerplexitySources === 0 && perplexityResults.length > 0) {
      console.warn("WARNING: No Perplexity sources detected in the answer! Adding enforcement notice.");
      
      // Add a notice about missing Perplexity sources
      const warningNote = `[IMPORTANT: This answer may be missing key insights from Perplexity AI sources. Please regenerate for a more complete analysis.]

`;
      
      // Force inclusion of at least one Perplexity source
      usedSourceUrls = [...usedSourceUrls, ...(perplexityResults.slice(0, 2).map(s => s.url))];
      
      // Add warning to the content
      const enhancedContent = warningNote + content;
      
      // Mark sources as used in the answer
      const sourcesWithUsageTracking = allSources.map(source => ({
        ...source,
        used: source.url ? usedSourceUrls.includes(source.url) : false
      }));
      
      return {
        answer: enhancedContent,
        query,
        search_results: sourcesWithUsageTracking,
        usedSourceUrls
      } as OpenAIResponse;
    }
    
    // Mark which sources were actually used in the answer
    const sourcesWithUsageTracking = allSources.map(source => ({
      ...source,
      used: source.url ? usedSourceUrls.includes(source.url) : false
    }));

    return {
      answer: content,
      query,
      search_results: sourcesWithUsageTracking,
      usedSourceUrls
    } as OpenAIResponse;
  } catch (error) {
    console.error('Error in OpenAI summarization:', error);
    
    // Handle axios errors specifically
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      throw {
        message: `OpenAI API error: ${message}`,
        statusCode,
        source: 'openai'
      } as ApiError;
    }
    
    // Handle other errors
    throw {
      message: `Error summarizing with OpenAI: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 500,
      source: 'openai'
    } as ApiError;
  }
}

/**
 * Placeholder for backward compatibility - not actually used directly anymore
 */
export async function fetchFromOpenAI(query: string): Promise<OpenAIResponse> {
  return {
    answer: "OpenAI is now only used to summarize information from other sources, not as a source itself.",
    query,
    search_results: []
  } as OpenAIResponse;
} 