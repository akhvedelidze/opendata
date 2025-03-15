import React, { useState } from 'react';
import axios from 'axios';

export default function CustomUrlSettings() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('What are the requirements for a tourist visa to Armenia?');

  /**
   * Test the research flow with custom URLs
   */
  const runResearchTest = async () => {
    if (!testQuery.trim()) {
      setError('Please enter a test query');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/test-research-flow?query=${encodeURIComponent(testQuery)}`);
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Research Flow with Custom URLs</h2>
      <div className="mb-6">
        <div className="flex mb-4">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter test query"
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={runResearchTest}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
          >
            Test Research Flow
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This test will run your query through the research pipeline with both relevant and non-relevant custom URLs.
          It will show which custom sources were included in the final results based on their relevance to the answer.
        </p>
      </div>

      {loading && (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Running research test...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-2">Test Results:</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold">Query:</h4>
            <p className="text-gray-700">{results.query}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold">Source Statistics:</h4>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="bg-gray-100 p-3 rounded">
                <span className="font-bold">{results.sourceStats.total}</span> total sources
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <span className="font-bold">{results.sourceStats.perplexity}</span> Perplexity sources
              </div>
              <div className="bg-green-100 p-3 rounded">
                <span className="font-bold">{results.sourceStats.serper}</span> Web Search sources
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <span className="font-bold">{results.sourceStats.custom}</span> Custom sources
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold">Custom URLs:</h4>
            
            {results.customSources.included.length > 0 ? (
              <div className="mt-2">
                <p className="font-medium text-green-700">Included in results:</p>
                <ul className="list-disc pl-5 text-sm">
                  {results.customSources.included.map((url: string, index: number) => (
                    <li key={`included-${index}`} className="text-green-600">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-yellow-600 mt-2">No custom URLs were included in the results.</p>
            )}
            
            {results.customSources.excluded.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-700">Excluded from results:</p>
                <ul className="list-disc pl-5 text-sm">
                  {results.customSources.excluded.map((url: string, index: number) => (
                    <li key={`excluded-${index}`} className="text-red-600">
                      {url}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold">Answer:</h4>
            <div className="whitespace-pre-wrap text-sm mt-1 bg-gray-50 p-4 rounded border">
              {results.answer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 