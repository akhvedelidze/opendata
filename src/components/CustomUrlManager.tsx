import { useState, useEffect } from 'react';

interface CustomUrlManagerProps {
  onUrlsChange: (urls: string[]) => void;
  disabled?: boolean;
}

export default function CustomUrlManager({ onUrlsChange, disabled = false }: CustomUrlManagerProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const MAX_URLS = 15;

  // Load saved URLs from localStorage on mount
  useEffect(() => {
    const savedUrls = localStorage.getItem('customResearchUrls');
    if (savedUrls) {
      try {
        const parsedUrls = JSON.parse(savedUrls);
        if (Array.isArray(parsedUrls)) {
          setUrls(parsedUrls);
          onUrlsChange(parsedUrls);
        }
      } catch (err) {
        console.error('Error loading saved URLs:', err);
        localStorage.removeItem('customResearchUrls');
      }
    }
  }, [onUrlsChange]);

  // Save URLs to localStorage when they change
  useEffect(() => {
    localStorage.setItem('customResearchUrls', JSON.stringify(urls));
  }, [urls]);
  
  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Add a new URL
  const addUrl = () => {
    setError(null);
    
    if (!inputUrl.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    if (!isValidUrl(inputUrl)) {
      setError('Please enter a valid URL (must include http:// or https://)');
      return;
    }
    
    if (urls.includes(inputUrl)) {
      setError('This URL is already in your list');
      return;
    }
    
    if (urls.length >= MAX_URLS) {
      setError(`Maximum ${MAX_URLS} URLs allowed`);
      return;
    }
    
    const newUrls = [...urls, inputUrl];
    setUrls(newUrls);
    onUrlsChange(newUrls);
    setInputUrl('');
  };
  
  // Remove a URL
  const removeUrl = (urlToRemove: string) => {
    const newUrls = urls.filter(url => url !== urlToRemove);
    setUrls(newUrls);
    onUrlsChange(newUrls);
  };
  
  // Clear all URLs
  const clearAllUrls = () => {
    setUrls([]);
    onUrlsChange([]);
  };

  return (
    <div className="custom-url-manager mb-6 border border-gray-200 rounded-lg p-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left font-medium"
        type="button"
        disabled={disabled}
      >
        <span>Custom URL Sources {urls.length > 0 && `(${urls.length})`}</span>
        <svg 
          className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">
            Add specific URLs (up to {MAX_URLS}) to include in your research
          </p>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              disabled={disabled || urls.length >= MAX_URLS}
            />
            <button
              onClick={addUrl}
              className="px-3 py-2 bg-blue-600 text-white rounded-md"
              disabled={disabled || urls.length >= MAX_URLS}
              type="button"
            >
              Add
            </button>
          </div>
          
          {error && (
            <p className="text-red-600 text-sm mb-2">{error}</p>
          )}
          
          {urls.length > 0 ? (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Added URLs:</h4>
                <button
                  onClick={clearAllUrls}
                  className="text-sm text-red-600"
                  disabled={disabled}
                  type="button"
                >
                  Clear All
                </button>
              </div>
              <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y">
                {urls.map((url, index) => (
                  <li key={index} className="flex justify-between items-center p-2 text-sm">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-600 truncate max-w-[90%]"
                    >
                      {url}
                    </a>
                    <button
                      onClick={() => removeUrl(url)}
                      className="text-red-500"
                      disabled={disabled}
                      type="button"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No custom URLs added yet</p>
          )}
        </div>
      )}
    </div>
  );
} 