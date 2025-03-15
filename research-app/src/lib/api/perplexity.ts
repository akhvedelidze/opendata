import axios from 'axios';
import { PerplexityResponse, ApiError } from '../types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/v1/query';

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
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        query,
        max_results: 5,
        language: 'en',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data as PerplexityResponse;
  } catch (error: any) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    
    throw {
      message: error.response?.data?.message || 'Failed to fetch data from Perplexity',
      statusCode: error.response?.status || 500,
      source: 'perplexity'
    } as ApiError;
  }
} 