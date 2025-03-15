import axios from 'axios';
import { SerperResponse, ApiError, SerperSearchResult } from '../types';

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Fetches information from Serper Google Search API
 * as part of the specialized research workflow
 */
export async function fetchFromSerper(query: string): Promise<SerperResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    throw {
      message: 'Serper API key is not configured',
      statusCode: 500,
      source: 'serper'
    } as ApiError;
  }

  try {
    console.log(`Fetching from Serper Google Search API for specialized research query: "${query}"`);
    
    const response = await axios.post(
      SERPER_API_URL,
      {
        q: query,
        gl: 'us',
        hl: 'en',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey
        }
      }
    );

    console.log(`Serper search completed successfully with ${response.data.organic?.length || 0} organic results`);
    return response.data as SerperResponse;
  } catch (error: any) {
    console.error('Serper API error:', error.response?.data || error.message);
    
    throw {
      message: error.response?.data?.message || 'Failed to fetch data from Serper',
      statusCode: error.response?.status || 500,
      source: 'serper'
    } as ApiError;
  }
}

/**
 * Searches the web with Serper API
 */
export async function searchWithSerper(query: string, serperApiKey: string): Promise<SerperSearchResult> {
  try {
    console.log(`Searching with Serper for query: "${query}"`);
    
    // Call Serper API
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: 10
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error from Serper API: ${text} (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.organic || !Array.isArray(data.organic)) {
      console.warn('No organic results returned from Serper');
      return { organic: [] };
    }
    
    console.log(`Retrieved ${data.organic.length} organic results from Serper`);
    return data as SerperSearchResult;
  } catch (error) {
    console.error(`Error in Serper search: ${error instanceof Error ? error.message : String(error)}`);
    throw {
      message: `Error searching with Serper: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 500,
      source: 'serper'
    } as ApiError;
  }
} 