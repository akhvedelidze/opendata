import React from 'react';
import { SearchResult } from '../lib/types';
// Use a more compatible icon approach
import Link from 'next/link';

interface SourceCitationProps {
  source: SearchResult;
  index?: number;
  showIndex?: boolean;
  className?: string;
}

/**
 * Enhanced component for displaying a source citation with title, URL, and integration indicators
 */
export const SourceCitation: React.FC<SourceCitationProps> = ({
  source,
  index,
  showIndex = true,
  className = '',
}) => {
  // Ensure source has a title
  const title = source.title || 'Untitled Source';
  const url = source.url || '#';
  const displayIndex = typeof index === 'number' ? index + 1 : null;
  
  // Styling based on source type with enhanced visuals for Perplexity
  const sourceTypeStyles = {
    perplexity: 'border-purple-300 bg-purple-50 shadow-md border-l-4 border-l-purple-500',
    serper: 'border-blue-300 bg-blue-50 border-l-4 border-l-blue-400',
    custom: 'border-green-300 bg-green-50 border-l-4 border-l-green-400',
    unknown: 'border-gray-300 bg-gray-50'
  };
  
  const sourceStyle = sourceTypeStyles[source.source as keyof typeof sourceTypeStyles] || sourceTypeStyles.unknown;
  
  // Update source labels to be more descriptive and highlight source type
  const sourceLabels = {
    perplexity: 'Perplexity AI',
    serper: 'Web Search',
    custom: 'Custom Source',
    unknown: 'Unknown Source'
  };

  // Source type icons
  const sourceIcons = {
    perplexity: '🔮',
    serper: '🌐',
    custom: '📄',
    unknown: '❓'
  };

  // Calculate an excerpt from the snippet if it exists
  const excerpt = source.snippet 
    ? source.snippet.length > 180 
      ? source.snippet.substring(0, 180) + '...' 
      : source.snippet
    : '';

  return (
    <div className={`flex flex-col ${sourceStyle} rounded-md p-4 ${className} hover:shadow-md transition-shadow duration-200 relative`}>
      {source.source === 'perplexity' && (
        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
          <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs rounded-full shadow-md">
            AI Search
          </span>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        {showIndex && displayIndex !== null && (
          <span className="font-medium text-gray-500 min-w-[24px] mr-2 px-1.5 py-0.5 bg-gray-100 rounded-full text-center text-xs">
            {displayIndex}
          </span>
        )}
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="mr-2 text-lg" aria-hidden="true">
              {sourceIcons[source.source as keyof typeof sourceIcons]}
            </span>
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          {url && url !== '#' && (
            <div className="mt-1">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline text-sm truncate block"
              >
                {url}
              </a>
            </div>
          )}
        </div>
        <div className="ml-2 flex flex-col items-end">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize 
            ${source.source === 'perplexity' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 
              source.source === 'serper' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
              source.source === 'custom' ? 'bg-green-100 text-green-800 border border-green-200' : 
              'bg-gray-100 text-gray-800 border border-gray-200'}`}>
            {sourceLabels[source.source as keyof typeof sourceLabels]}
          </span>
          {source.used && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
              Used in Answer
            </span>
          )}
        </div>
      </div>
      
      {excerpt && (
        <div className="mt-2 text-sm text-gray-600 bg-white p-3 rounded border border-gray-100">
          <div className="mb-1 text-xs text-gray-500 uppercase tracking-wide">Excerpt:</div>
          {excerpt}
        </div>
      )}
      
      {/* Integration indicator - shows how this source integrates with others */}
      {source.used && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Source integration:</span>
            <div className="flex items-center">
              {source.source === 'perplexity' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span>
                  <span className="text-xs text-purple-700 mr-2">Perplexity</span>
                </>
              )}
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
              <span className="text-xs text-blue-700 mr-2">Web</span>
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              <span className="text-xs text-green-700">Custom</span>
            </div>
          </div>
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
            <div className="h-full bg-purple-500" style={{ width: source.source === 'perplexity' ? '40%' : '30%' }}></div>
            <div className="h-full bg-blue-500" style={{ width: source.source === 'serper' ? '40%' : '30%' }}></div>
            <div className="h-full bg-green-500" style={{ width: source.source === 'custom' ? '40%' : '30%' }}></div>
          </div>
          <div className="mt-1 text-xs text-center text-gray-500">
            {source.source === 'perplexity' 
              ? 'Perplexity AI insights enrich this answer'
              : source.source === 'serper'
              ? 'Web search results verify this information'
              : 'Custom source provides context'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceCitation; 