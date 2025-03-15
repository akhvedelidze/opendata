// API Response Types
export interface PerplexityResponse {
  answer: string;
  query: string;
  search_results: {
    title: string;
    url: string;
    snippet: string;
  }[];
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

// Unified Search Result Type
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'perplexity' | 'serper';
  relevanceScore?: number;
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
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  source?: string;
} 