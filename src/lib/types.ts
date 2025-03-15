// API Response Types
export interface PerplexityResponse {
  results: SearchResult[];
  answer: string;
  error?: string;
  query?: string; // Optional query field for tracking the original query
}

export interface SerperResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
  organic: {
    title: string;
    link: string;
    snippet: string;
    position: number;
  }[];
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
  };
  answerBox?: {
    title: string;
    answer: string;
  };
}

export interface OpenAIResponse {
  answer: string;
  query: string;
  search_results: {
    title: string;
    url: string;
    snippet: string;
  }[];
  usedSourceUrls?: string[]; // URLs of sources that were actually used in the answer
}

// Unified Search Result Type
export interface SearchResult {
  url?: string;
  title?: string;
  content?: string;
  snippet?: string;
  source: string;
  // Additional fields that might be relevant
  position?: number;
  date?: string;
  used?: boolean; // Track if this source was actually used in the final answer
  priority?: 'high' | 'medium' | 'low'; // Priority level for source prominence
}

// Final Research Result
export interface ResearchResult {
  query: string;
  answer: string;
  sources: SearchResult[];
  generatedAt: string;
}

// Research Query
export interface ResearchQuery {
  query: string;
  maxResults?: number;
  customUrls?: string[];
  language?: string;
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  source?: string;
}

// Perplexity API types
export interface PerplexitySearchResult {
  answer?: string;
  web_search: {
    results?: Array<{
      url: string;
      title?: string;
      extract?: string;
      content?: string;
    }>;
  };
}

// Serper API types
export interface SerperSearchResult {
  organic: Array<{
    title?: string;
    link: string;
    snippet?: string;
    position?: number;
  }>;
  answerBox?: {
    answer?: string;
    title?: string;
    snippet?: string;
  };
  knowledgeGraph?: {
    title: string;
    description: string;
    link?: string;
  };
} 