import axios from 'axios';
import { SerperResponse, ApiError } from '../types';

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Fetches information from Serper Google Search API
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