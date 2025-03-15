import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ResearchResult } from '@/lib/types';

interface ResearchResultsProps {
  result: ResearchResult | null;
}

export default function ResearchResults({ result }: ResearchResultsProps) {
  const [showSources, setShowSources] = useState(false);

  if (!result) return null;

  const { query, answer, sources, generatedAt } = result;
  
  const formattedDate = new Date(generatedAt).toLocaleString();

  return (
    <div className="result-card">
      <h2 className="result-heading">Research Results</h2>
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Query</div>
        <div className="font-medium">{query}</div>
      </div>
      
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-1">Answer</div>
        <div className="result-content">
          <ReactMarkdown className="result-content">{answer}</ReactMarkdown>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowSources(!showSources)}
          className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
        >
          {showSources ? 'Hide Sources' : 'Show Sources'} ({sources.length})
          <svg
            className={`ml-1 h-4 w-4 transform transition-transform ${
              showSources ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        
        {showSources && (
          <div className="mt-4 space-y-4">
            {sources.map((source, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4">
                <h3 className="font-medium text-gray-800">{source.title}</h3>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="citation block mb-1"
                  >
                    {source.url}
                  </a>
                )}
                <p className="text-gray-600 text-sm">{source.snippet}</p>
                <div className="text-xs text-gray-400 mt-1">
                  Source: {source.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-xs text-gray-400 text-right">
        Generated at {formattedDate}
      </div>
    </div>
  );
} 