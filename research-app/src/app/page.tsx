'use client';

import { useState } from 'react';
import axios from 'axios';
import SearchForm from '@/components/SearchForm';
import ResearchResults from '@/components/ResearchResults';
import { ResearchResult } from '@/lib/types';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/research', { query });
      setResult(response.data);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(
        err.response?.data?.error || 
        'An error occurred while conducting research. Please try again.'
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="research-container">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-2">
          Research Assistant
        </h1>
        <p className="text-gray-600">
          Enter your research question and get comprehensive answers from multiple sources.
        </p>
      </div>

      <SearchForm onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && !result && (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-3 text-lg text-gray-700">Researching...</span>
        </div>
      )}

      {result && <ResearchResults result={result} />}
    </main>
  );
} 