import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ResearchResult, SearchResult } from '../lib/types';
import { formatCitation } from '../lib/api/api-utils';
import SourceCitation from './SourceCitation';

interface ResearchResultsProps {
  result: ResearchResult;
  isLoading?: boolean;
}

/**
 * Enhanced rendering of markdown with formatted citations and source type highlighting
 * Replaces citation links and improves readability with source attribution
 */
const renderMarkdownWithFormattedCitations = (
  text: string, 
  sources: SearchResult[]
): React.ReactNode => {
  // Process the text to identify sections if they exist
  const addSectionFormatting = (content: string): string => {
    // Enhanced heading formatting
    let formatted = content.replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
      return `${hashes} ${title}`;
    });
    
    // Create table of contents if there are multiple headings
    const headings = content.match(/^##\s+(.+)$/gm);
    if (headings && headings.length >= 3) {
      const toc = "## Table of Contents\n" + 
        headings.map(h => {
          const headingText = h.replace(/^##\s+/, '').trim();
          const anchor = headingText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          return `- [${headingText}](#${anchor})`;
        }).join('\n');
      
      formatted = toc + '\n\n' + formatted;
    }
    
    // Improve readability of lists
    formatted = formatted.replace(/^(\s*[-*])\s+/gm, '$1 ');
    
    return formatted;
  };
  
  // Find the SOURCES USED section if it exists
  const splitSources = text.split(/^SOURCES\s*USED:?/mi);
  let mainContent = splitSources[0];
  const sourcesSection = splitSources.length > 1 ? splitSources[1] : null;
  
  // Apply section formatting to the main content
  mainContent = addSectionFormatting(mainContent);
  
  // Check for any warning notices at the beginning and style them
  mainContent = mainContent.replace(/\[(NOTE|IMPORTANT|WARNING)[^\]]*\]/i, 
    (match) => `<div class="notice">${match}</div>`);
  
  return (
    <>
      <div className="answer-main prose prose-headings:text-gray-800 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-1 max-w-none">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => {
              const href = props.href || '';
              const children = props.children || '';
              
              // Check if this is a citation link (e.g., [1](url))
              const citationMatch = String(children).match(/^\[(\d+)\]$/);
              
              if (citationMatch) {
                const index = parseInt(citationMatch[1], 10) - 1;
                
                // Find the source by index or URL
                const source = sources[index] || 
                  sources.find(s => s.url === href) || 
                  { url: href, title: 'Unknown Source', source: 'unknown' };
                
                // Determine source type styling
                const sourceTypeStyles = {
                  perplexity: 'bg-purple-100 text-purple-800 border-purple-200 border shadow-sm',
                  serper: 'bg-blue-100 text-blue-800 border-blue-200 border',
                  custom: 'bg-green-100 text-green-800 border-green-200 border',
                  unknown: 'bg-gray-100 text-gray-800 border-gray-200 border'
                };
                
                const sourceStyle = sourceTypeStyles[source.source as keyof typeof sourceTypeStyles] || sourceTypeStyles.unknown;
                
                // Source type labels
                const sourceLabels = {
                  perplexity: 'Perplexity AI',
                  serper: 'Web Search',
                  custom: 'Custom Source',
                  unknown: 'Unknown Source'
                };
                
                // Format the citation with enhanced tooltip
                return (
                  <span className="relative group">
                    <a 
                      href={source.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-1.5 py-1 rounded text-xs font-medium ${sourceStyle} hover:opacity-90`}
                      title={`${source.title} (${sourceLabels[source.source as keyof typeof sourceLabels]})`}
                    >
                      <span className="mr-0.5">[{index + 1}]</span>
                      <span className="hidden sm:inline-block text-[10px] opacity-70">
                        {source.source === 'perplexity' ? '🔮' : source.source === 'serper' ? '🌐' : source.source === 'custom' ? '📄' : '❓'}
                      </span>
                    </a>
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 bg-white p-2 rounded shadow-lg border text-xs z-10">
                      <span className="font-bold block">{source.title}</span>
                      <span className="text-gray-500 text-xs block truncate">{source.url}</span>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        source.source === 'perplexity' ? 'bg-purple-100 text-purple-800' :
                        source.source === 'serper' ? 'bg-blue-100 text-blue-800' :
                        source.source === 'custom' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sourceLabels[source.source as keyof typeof sourceLabels]}
                      </span>
                    </span>
                  </span>
                );
              } else if (href.startsWith('#')) {
                // Handle internal anchor links for table of contents
                return (
                  <a 
                    href={href} 
                    className="text-blue-600 hover:underline font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      const targetId = href.slice(1);
                      const targetElement = document.getElementById(targetId) || 
                                            document.querySelector(`[id="${targetId}"]`);
                      if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    {...props}
                  />
                );
              }
              
              // Regular link
              return (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  {...props}
                />
              );
            },
            
            h1: ({ node, ...props }) => {
              const idMatch = props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h1 id={idMatch} className="text-2xl font-bold mt-6 mb-4 pb-2 border-b text-gray-900" {...props} />;
            },
            h2: ({ node, ...props }) => {
              const idMatch = props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h2 id={idMatch} className="text-xl font-bold mt-5 mb-3 text-gray-800 pb-1 border-b border-gray-100" {...props} />;
            },
            h3: ({ node, ...props }) => {
              const idMatch = props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h3 id={idMatch} className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />;
            },
            h4: ({ node, ...props }) => {
              const idMatch = props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h4 id={idMatch} className="text-base font-semibold mt-3 mb-2 text-gray-800" {...props} />;
            },
            
            p: ({ node, ...props }) => (
              <p className="my-2 text-gray-700 leading-relaxed whitespace-pre-line text-base" {...props} />
            ),
            
            ul: ({ node, ...props }) => <ul className="my-3 pl-6 list-disc space-y-1 text-gray-700" {...props} />,
            ol: ({ node, ...props }) => <ol className="my-3 pl-6 list-decimal space-y-1 text-gray-700" {...props} />,
            li: ({ node, ...props }) => <li className="mb-1 pl-1" {...props} />,
            
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4 bg-gray-50 py-2 rounded-r" {...props} />
            ),
            
            div: ({ node, className, ...props }) => {
              if (className?.includes('notice')) {
                return <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 my-4 text-yellow-800 rounded" {...props} />;
              }
              return <div {...props} />;
            },
            
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 rounded" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-gray-100 text-left" {...props} />,
            th: ({ node, ...props }) => <th className="py-2 px-4 border border-gray-300 font-semibold text-sm" {...props} />,
            td: ({ node, ...props }) => <td className="py-2 px-4 border border-gray-300 text-sm" {...props} />,
            
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              
              if (inline) {
                return <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
              }
              
              return (
                <div className="relative">
                  <pre className="bg-gray-100 rounded-md p-3 overflow-x-auto my-3 text-sm">
                    <code className={match ? `language-${match[1]} font-mono` : 'text-gray-800 font-mono'} {...props}>
                      {String(children).replace(/\n$/, '')}
                    </code>
                  </pre>
                  {match && (
                    <div className="absolute top-0 right-0 bg-gray-200 px-2 py-0.5 rounded-bl text-xs text-gray-700">
                      {match[1]}
                    </div>
                  )}
                </div>
              );
            },
            
            pre: ({ children }) => <>{children}</>
          }}
        >
          {mainContent}
        </ReactMarkdown>
      </div>
      
      {sourcesSection && (
        <div className="sources-used-section mt-6 border-t pt-4">
          <h3 className="text-base font-bold text-gray-800 mb-2">Sources Used</h3>
          <div className="source-categories grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="perplexity-sources bg-purple-50 border border-purple-200 rounded-md p-3">
              <h4 className="text-purple-800 font-medium text-sm mb-2 flex items-center">
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                Perplexity AI Sources
              </h4>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="text-xs text-gray-700" {...props} />,
                  ul: ({ node, ...props }) => <ul className="text-xs list-disc pl-4 text-gray-700" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                }}
              >
                {sourcesSection.replace(/Perplexity Sources:([\s\S]*?)(?:Web Search Sources:|Custom Sources:|$)/, '$1')}
              </ReactMarkdown>
            </div>
            
            <div className="web-sources bg-blue-50 border border-blue-200 rounded-md p-3">
              <h4 className="text-blue-800 font-medium text-sm mb-2 flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                Web Search Sources
              </h4>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="text-xs text-gray-700" {...props} />,
                  ul: ({ node, ...props }) => <ul className="text-xs list-disc pl-4 text-gray-700" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                }}
              >
                {sourcesSection.replace(/Web Search Sources:([\s\S]*?)(?:Perplexity Sources:|Custom Sources:|$)/, '$1')}
              </ReactMarkdown>
            </div>
            
            <div className="custom-sources bg-green-50 border border-green-200 rounded-md p-3">
              <h4 className="text-green-800 font-medium text-sm mb-2 flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                Custom Sources
              </h4>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="text-xs text-gray-700" {...props} />,
                  ul: ({ node, ...props }) => <ul className="text-xs list-disc pl-4 text-gray-700" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                }}
              >
                {sourcesSection.replace(/Custom Sources:([\s\S]*?)(?:Perplexity Sources:|Web Search Sources:|$)/, '$1')}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ResearchResults: React.FC<ResearchResultsProps> = ({ 
  result, 
  isLoading = false 
}) => {
  const [showAllSources, setShowAllSources] = useState(false);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'perplexity' | 'serper' | 'custom'>('all');
  const [contentViewMode, setContentViewMode] = useState<'integrated' | 'perplexity' | 'web' | 'custom'>('integrated');
  const [sourceSections, setSourceSections] = useState<{perplexity: string[], serper: string[], custom: string[]}>({
    perplexity: [], serper: [], custom: []
  });
  const [perplexityInsights, setPerplexityInsights] = useState<string>('');
  
  // Analyze the answer to extract sections that might be attributed to specific source types
  useEffect(() => {
    if (!result.answer) return;
    
    // Simple heuristic - look for markers that might indicate a source type section
    const sections = result.answer.split(/\n#{1,3} /);
    const perplexitySections = sections.filter(s => 
      /perplexity|ai search|ai results/i.test(s)
    );
    const serperSections = sections.filter(s => 
      /web search|search results|online sources/i.test(s) && 
      !/perplexity|ai search/i.test(s)
    );
    const customSections = sections.filter(s => 
      /custom source|provided content|user provided/i.test(s)
    );
    
    setSourceSections({
      perplexity: perplexitySections,
      serper: serperSections,
      custom: customSections
    });
    
    // Check if Perplexity sources are featured in the answer
    const hasPerplexitySection = result.answer.match(/(?:^|\n)#+\s*.*perplexity.*(?:\n|$)/i) !== null;
    const perplexitySources = result.sources.filter(s => s.source === 'perplexity' && s.used);
    
    // If we have Perplexity sources but no clear section, generate insights
    if (perplexitySources.length > 0 && !hasPerplexitySection) {
      // Get snippets from Perplexity sources to create insights
      let insights = "## Key Insights from Perplexity AI\n\n";
      insights += "The following information was found by Perplexity AI search:\n\n";
      
      perplexitySources.slice(0, 3).forEach((source, index) => {
        if (source.snippet) {
          const shortSnippet = source.snippet.length > 200
            ? source.snippet.substring(0, 200) + '...'
            : source.snippet;
          
          insights += `- ${shortSnippet} [[${index + 1}] ${source.title || 'Source'}](${source.url || '#'})\n\n`;
        }
      });
      
      setPerplexityInsights(insights);
    } else {
      setPerplexityInsights('');
    }
  }, [result.answer, result.sources]);
  
  // Helper function to highlight source-specific content based on current view mode
  const getFilteredContent = (): string => {
    if (contentViewMode === 'integrated') {
      return result.answer;
    }
    
    // Extract SOURCES USED section if it exists
    const splitSources = result.answer.split(/^SOURCES\s*USED:?/mi);
    let mainContent = splitSources[0];
    const sourcesSection = splitSources.length > 1 ? splitSources[1] : '';
    
    // Find citations that are of the selected source type
    const relevantSources = result.sources.filter(s => {
      if (contentViewMode === 'perplexity') return s.source === 'perplexity';
      if (contentViewMode === 'web') return s.source === 'serper';
      if (contentViewMode === 'custom') return s.source === 'custom';
      return false;
    });
    
    const relevantSourceUrls = relevantSources.map(s => s.url);
    
    // Highlight paragraphs containing citations to the relevant sources
    const paragraphs = mainContent.split(/\n\n+/);
    const highlightedParagraphs = paragraphs.map(p => {
      // Look for citation links in this paragraph
      const links = p.match(/\[[^\]]+\]\(([^)]+)\)/g);
      if (!links) return p;
      
      // Check if any of these links are to relevant sources
      const hasRelevantSource = links.some(link => {
        const urlMatch = link.match(/\([^)]+\)/);
        if (!urlMatch) return false;
        const url = urlMatch[0].slice(1, -1); // Remove parentheses
        return relevantSourceUrls.includes(url);
      });
      
      if (hasRelevantSource) {
        // Add a highlight marker
        return `<div class="source-highlight ${contentViewMode}">${p}</div>`;
      }
      
      return p;
    });
    
    return highlightedParagraphs.join('\n\n') + (sourcesSection ? `\n\nSOURCES USED:\n${sourcesSection}` : '');
  };
  
  // Function to add Perplexity insights to the answer if needed
  const getEnhancedAnswer = (): string => {
    // If we have Perplexity insights to add and we're in integrated view, add them
    if (perplexityInsights && contentViewMode === 'integrated') {
      // Check if the answer already has a section highlighting Perplexity
      // Only add our insights if there's no Perplexity section already
      if (!result.answer.match(/^#+\s+.*perplexity.*$/mi)) {
        return perplexityInsights + result.answer;
      }
    }
    return getFilteredContent();
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      </div>
    );
  }

  // Filter sources based on usage and type
  const usedSources = result.sources.filter(source => source.used);
  const baseSources = showAllSources ? result.sources : usedSources;
  
  // Apply source type filter if not set to 'all'
  const displaySources = sourceTypeFilter === 'all' 
    ? baseSources 
    : baseSources.filter(source => source.source === sourceTypeFilter);
  
  // Count sources by type
  const counts = {
    all: baseSources.length,
    perplexity: baseSources.filter(s => s.source === 'perplexity').length,
    serper: baseSources.filter(s => s.source === 'serper').length,
    custom: baseSources.filter(s => s.source === 'custom').length
  };
  
  // Calculate source balance metrics
  const sourceBalancePercent = {
    perplexity: counts.perplexity > 0 ? (counts.perplexity / counts.all) * 100 : 0,
    serper: counts.serper > 0 ? (counts.serper / counts.all) * 100 : 0,
    custom: counts.custom > 0 ? (counts.custom / counts.all) * 100 : 0
  };

  // Check if sources are missing
  const isPerplexityMissing = counts.perplexity === 0;
  const isSerperMissing = counts.serper === 0;
  const isCustomMissing = counts.custom === 0;

  // Check if custom sources exist in the result
  const hasCustomSources = result.sources.some(s => s.source === 'custom');

  // Calculate overall balance status
  const hasAllSourceTypes = counts.perplexity > 0 && counts.serper > 0 && (!hasCustomSources || counts.custom > 0);
  const isWellBalanced = 
    sourceBalancePercent.perplexity >= 20 && 
    sourceBalancePercent.serper >= 20 && 
    (hasCustomSources ? sourceBalancePercent.custom >= 20 : true);
  
  return (
    <div className="research-results">
      <div className="answer-container mb-8">
        <div className="source-balance-header flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mr-2">
            Answer
          </h2>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            hasAllSourceTypes && isWellBalanced 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {hasAllSourceTypes 
              ? (isWellBalanced ? 'Sources Balanced' : 'Needs Better Balance') 
              : 'Missing Source Types'}
          </div>
          
          {/* Add Perplexity indicator */}
          {result.sources.some(s => s.source === 'perplexity' && s.used) && (
            <div className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              Perplexity Insights
            </div>
          )}
          
          <div className="flex ml-auto items-center gap-2 text-xs">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
              <span>Perplexity</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              <span>Web</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span>Custom</span>
            </div>
          </div>
        </div>
        
        {/* Content view mode tabs */}
        <div className="content-view-tabs mb-3 border-b">
          <div className="flex">
            <button
              onClick={() => setContentViewMode('integrated')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                contentViewMode === 'integrated' 
                  ? 'border-gray-800 text-gray-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Integrated View
            </button>
            {counts.perplexity > 0 && (
              <button
                onClick={() => setContentViewMode('perplexity')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  contentViewMode === 'perplexity' 
                    ? 'border-purple-600 text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-purple-700'
                }`}
              >
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
                  Perplexity Content
                </span>
              </button>
            )}
            {counts.serper > 0 && (
              <button
                onClick={() => setContentViewMode('web')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  contentViewMode === 'web' 
                    ? 'border-blue-600 text-blue-800' 
                    : 'border-transparent text-gray-500 hover:text-blue-700'
                }`}
              >
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                  Web Content
                </span>
              </button>
            )}
            {counts.custom > 0 && (
              <button
                onClick={() => setContentViewMode('custom')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  contentViewMode === 'custom' 
                    ? 'border-green-600 text-green-800' 
                    : 'border-transparent text-gray-500 hover:text-green-700'
                }`}
              >
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                  Custom Content
                </span>
              </button>
            )}
          </div>
        </div>

        {contentViewMode !== 'integrated' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3 text-sm text-yellow-800">
            Showing content primarily from <strong className="capitalize">{contentViewMode === 'web' ? 'Web Search' : contentViewMode}</strong> sources. 
            {contentViewMode === 'perplexity' && 'Highlighted sections contain information from Perplexity AI.'}
            {contentViewMode === 'web' && 'Highlighted sections contain information from Web Search results.'}
            {contentViewMode === 'custom' && 'Highlighted sections contain information from Custom Sources.'}
          </div>
        )}
        
        <div className="answer-content bg-white p-5 rounded-lg border shadow-sm">
          {renderMarkdownWithFormattedCitations(getEnhancedAnswer(), result.sources)}
        </div>
      </div>
      
      {/* Perplexity-centric source summary */}
      {counts.perplexity > 0 && (
        <div className="perplexity-summary mb-6 border border-purple-200 rounded-lg p-4 bg-purple-50 shadow-sm">
          <h3 className="font-medium text-purple-800 flex items-center mb-2 text-lg">
            <span className="mr-2">🔮</span>
            Perplexity AI Insights
          </h3>
          <p className="text-gray-700 mb-3">
            This answer includes insights from Perplexity AI, which provides state-of-the-art analysis powered by advanced artificial intelligence. Perplexity combines information from multiple sources to deliver comprehensive and accurate results.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded p-3 border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-800 mb-1">Sources Used</h4>
              <p className="text-sm text-gray-600">
                {result.sources.filter(s => s.source === 'perplexity' && s.used).length} Perplexity sources contributed to this answer.
              </p>
            </div>
            
            <div className="bg-white rounded p-3 border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-800 mb-1">Benefits</h4>
              <p className="text-sm text-gray-600">
                Perplexity AI provides AI-enhanced analysis, semantic search capabilities, and real-time information access.
              </p>
            </div>
          </div>
          
          <div className="mt-3 text-right">
            <button 
              onClick={() => {
                setSourceTypeFilter('perplexity');
                setContentViewMode('perplexity');
              }} 
              className="text-purple-700 hover:text-purple-900 text-sm font-medium hover:underline focus:outline-none"
            >
              View All Perplexity Sources →
            </button>
          </div>
        </div>
      )}
      
      {/* Source categories summary */}
      <div className="source-category-summary mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {counts.perplexity > 0 && (
          <div className={`perplexity-summary p-3 border rounded-md ${contentViewMode === 'perplexity' ? 'bg-purple-50 border-purple-300 shadow-md' : 'bg-white border-gray-200'}`}>
            <h3 className="font-medium text-purple-800 flex items-center mb-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              Perplexity Sources ({counts.perplexity})
            </h3>
            <p className="text-sm text-gray-600">
              AI-generated insights from Perplexity that provide comprehensive analysis and targeted information.
            </p>
            <button 
              onClick={() => {
                setSourceTypeFilter('perplexity');
                setContentViewMode('perplexity');
              }}
              className="mt-2 text-xs text-purple-700 hover:text-purple-900 underline"
            >
              Focus on Perplexity content
            </button>
          </div>
        )}
        
        {counts.serper > 0 && (
          <div className={`web-summary p-3 border rounded-md ${contentViewMode === 'web' ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-200'}`}>
            <h3 className="font-medium text-blue-800 flex items-center mb-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              Web Sources ({counts.serper})
            </h3>
            <p className="text-sm text-gray-600">
              Information gathered from various websites, providing factual content and diverse perspectives.
            </p>
            <button 
              onClick={() => {
                setSourceTypeFilter('serper');
                setContentViewMode('web');
              }}
              className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline"
            >
              Focus on Web content
            </button>
          </div>
        )}
        
        {counts.custom > 0 && (
          <div className={`custom-summary p-3 border rounded-md ${contentViewMode === 'custom' ? 'bg-green-50 border-green-300 shadow-md' : 'bg-white border-gray-200'}`}>
            <h3 className="font-medium text-green-800 flex items-center mb-2">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              Custom Sources ({counts.custom})
            </h3>
            <p className="text-sm text-gray-600">
              User-provided content from specific URLs, offering targeted information and context.
            </p>
            <button 
              onClick={() => {
                setSourceTypeFilter('custom');
                setContentViewMode('custom');
              }}
              className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
            >
              Focus on Custom content
            </button>
          </div>
        )}
      </div>
      
      <div className="sources-container">
        <div className="flex flex-col space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Sources {displaySources.length > 0 && `(${displaySources.length})`}
            </h2>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="text-sm text-blue-600 hover:text-blue-800 mr-3"
              >
                {showAllSources ? 'Show Used Sources Only' : 'Show All Sources'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSourceTypeFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                sourceTypeFilter === 'all' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({counts.all})
            </button>
            {counts.perplexity > 0 && (
              <button
                onClick={() => setSourceTypeFilter('perplexity')}
                className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                  sourceTypeFilter === 'perplexity' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                Perplexity ({counts.perplexity})
              </button>
            )}
            {counts.serper > 0 && (
              <button
                onClick={() => setSourceTypeFilter('serper')}
                className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                  sourceTypeFilter === 'serper' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Web Search ({counts.serper})
              </button>
            )}
            {counts.custom > 0 && (
              <button
                onClick={() => setSourceTypeFilter('custom')}
                className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                  sourceTypeFilter === 'custom' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Custom Sources ({counts.custom})
              </button>
            )}
          </div>
        </div>
        
        {/* Source Balance Indicator */}
        <div className="mt-4 p-3 rounded-md border bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Source Balance</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              hasAllSourceTypes && isWellBalanced 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {hasAllSourceTypes 
                ? (isWellBalanced ? 'Well Balanced' : 'Needs Better Balance') 
                : 'Missing Source Types'}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Perplexity</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isPerplexityMissing ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(sourceBalancePercent.perplexity, 100)}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">{Math.round(sourceBalancePercent.perplexity)}%</span>
            </div>
            
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Web Search</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isSerperMissing ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(sourceBalancePercent.serper, 100)}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">{Math.round(sourceBalancePercent.serper)}%</span>
            </div>
            
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Custom</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isCustomMissing ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(sourceBalancePercent.custom, 100)}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">{Math.round(sourceBalancePercent.custom)}%</span>
            </div>
          </div>
          
          {!hasAllSourceTypes && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
              Warning: {isPerplexityMissing ? 'Perplexity sources, ' : ''}
              {isSerperMissing ? 'Web Search sources, ' : ''}
              {isCustomMissing ? 'Custom sources, ' : ''} 
              missing from the answer. Information may be incomplete.
            </div>
          )}
        </div>
        
        {displaySources.length > 0 ? (
          <div className="sources-list space-y-4">
            {displaySources.map((source, index) => (
              <SourceCitation 
                key={`${source.url}-${index}`}
                source={source}
                index={index}
                className=""
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic p-4 bg-gray-50 rounded-md border border-gray-200">
            No sources available with the current filter settings.
          </p>
        )}
      </div>
      
      <div className="mt-6 text-xs text-gray-500">
        Generated at: {new Date(result.generatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default ResearchResults; 