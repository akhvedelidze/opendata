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
      // Generate a simple answer if neither is available
      answer = `Based on the search results for "${query}", multiple relevant sources were found. Please check the references below for more information.`;
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