import { fetchFromPerplexity } from './perplexity';
import { fetchFromSerper } from './serper';
import { ResearchResult, SearchResult, ApiError } from '../types';

/**
 * Conducts research by fetching data from multiple APIs and aggregating results
 */
export async function conductResearch(query: string): Promise<ResearchResult> {
  try {
    // Fetch data from both APIs in parallel
    const [perplexityResponse, serperResponse] = await Promise.all([
      fetchFromPerplexity(query).catch(error => {
        console.error('Error fetching from Perplexity:', error);
        return null;
      }),
      fetchFromSerper(query).catch(error => {
        console.error('Error fetching from Serper:', error);
        return null;
      })
    ]);

    // Handle case where both APIs failed
    if (!perplexityResponse && !serperResponse) {
      throw {
        message: 'Failed to fetch data from any research source',
        statusCode: 500
      } as ApiError;
    }

    // Aggregate search results
    const sources: SearchResult[] = [];
    
    // Add Perplexity results
    if (perplexityResponse?.search_results) {
      sources.push(
        ...perplexityResponse.search_results.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          source: 'perplexity' as const,
          relevanceScore: 0.9 // Arbitrary high score for Perplexity results
        }))
      );
    }

    // Add Serper results
    if (serperResponse?.organic) {
      sources.push(
        ...serperResponse.organic.map((result, index) => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          source: 'serper' as const,
          relevanceScore: 0.9 - (index * 0.05) // Decrease score based on position
        }))
      );
    }

    // Add knowledge graph if available
    if (serperResponse?.knowledgeGraph) {
      sources.push({
        title: serperResponse.knowledgeGraph.title,
        url: '', // Knowledge graph doesn't always have a URL
        snippet: serperResponse.knowledgeGraph.description,
        source: 'serper' as const,
        relevanceScore: 1.0
      });
    }

    // Get final answer 
    let answer = '';
    
    if (perplexityResponse?.answer) {
      // Use Perplexity's AI-generated answer if available
      answer = perplexityResponse.answer;
    } else if (serperResponse?.answerBox?.answer) {
      // Fallback to Serper's answer box
      answer = serperResponse.answerBox.answer;
    } else {
      // Generate a comprehensive summary from the available sources
      answer = generateSummaryFromSources(query, sources);
    }

    // Filter out duplicates and sort by relevance
    const uniqueSources = filterAndSortSources(sources);

    return {
      query,
      answer,
      sources: uniqueSources,
      generatedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Research error:', error);
    throw error;
  }
}

/**
 * Generates a comprehensive summary from the collected sources
 * when no direct answer is available from the APIs
 */
function generateSummaryFromSources(query: string, sources: SearchResult[]): string {
  if (!sources || sources.length === 0) {
    return `No specific information was found regarding "${query}". Please try rephrasing your question or exploring a different topic.`;
  }

  // Extract key information from sources
  const snippets = sources.map(source => source.snippet).filter(Boolean);
  const titles = sources.map(source => source.title).filter(Boolean);
  
  // Get unique keywords from snippets and titles for better summarization
  const keyTerms = extractKeyTerms(query, [...snippets, ...titles]);
  
  // Format the summary in markdown for better presentation
  let summary = `# Research on "${query}"\n\n`;
  
  // Add a brief introduction
  summary += `Based on information gathered from multiple sources, here's what we found about "${query}":\n\n`;
  
  // Add main findings section
  summary += `## Main Findings\n\n`;
  
  // Generate bullet points from the most relevant sources (top 3-5)
  const topSources = sources.slice(0, Math.min(5, sources.length));
  topSources.forEach(source => {
    if (source.snippet) {
      // Extract a concise point from each snippet
      const point = extractConcisePoint(source.snippet);
      summary += `- ${point}\n`;
    }
  });
  
  // If we found key terms, include them
  if (keyTerms.length > 0) {
    summary += `\n## Key Concepts\n\n`;
    keyTerms.slice(0, 5).forEach(term => {
      summary += `- ${term}\n`;
    });
  }
  
  // Add a conclusion
  summary += `\n## Summary\n\n`;
  summary += `The research on "${query}" indicates various perspectives and information sources. `;
  summary += `For more detailed information, please review the references provided below.`;
  
  return summary;
}

/**
 * Extracts key terms from text content related to the query
 */
function extractKeyTerms(query: string, textContent: string[]): string[] {
  // Simple extraction of potentially important terms
  const allText = textContent.join(' ').toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/);
  
  // Find phrases or words that appear frequently
  const words = allText.split(/\s+/);
  const wordFrequency: Record<string, number> = {};
  
  // Count word frequencies
  words.forEach(word => {
    if (word.length > 3 && !queryWords.includes(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Find phrases (2-3 words)
  const phrases: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length > 3 && words[i+1].length > 3) {
      const phrase = `${words[i]} ${words[i+1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
  }
  
  // Combine and sort by frequency
  const terms = [...Object.entries(wordFrequency), ...Object.entries(phrases)]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term.charAt(0).toUpperCase() + term.slice(1));
  
  return terms;
}

/**
 * Extracts a concise point from a longer text snippet
 */
function extractConcisePoint(snippet: string): string {
  // If snippet is already short, use it directly
  if (snippet.length < 120) {
    return snippet.charAt(0).toUpperCase() + snippet.slice(1);
  }
  
  // Try to find the first complete sentence
  const sentenceMatch = snippet.match(/^[^.!?]*[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length > 20) {
    return sentenceMatch[0].trim();
  }
  
  // Otherwise, take the first ~100 characters and add ellipsis
  return snippet.substring(0, 100).trim() + '...';
}

/**
 * Filters and sorts sources to remove duplicates and prioritize by relevance
 */
function filterAndSortSources(sources: SearchResult[]): SearchResult[] {
  // Filter out duplicates based on URL
  const uniqueUrls = new Set<string>();
  const uniqueSources = sources.filter(source => {
    if (!source.url || uniqueUrls.has(source.url)) {
      return false;
    }
    uniqueUrls.add(source.url);
    return true;
  });

  // Sort by relevance score (highest first)
  return uniqueSources.sort((a, b) => 
    (b.relevanceScore || 0) - (a.relevanceScore || 0)
  ).slice(0, 10); // Limit to top 10 results
} 