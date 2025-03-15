import React, { useState } from 'react';
import axios from 'axios';

/**
 * Component for testing and diagnosing custom URL functionality
 */
export default function CustomUrlDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [diagnosticUrls, setDiagnosticUrls] = useState<string[]>([
    'https://www.mfa.am/en/visa/',
    'https://www.evisa.am/visa-information.html',
    'https://www.petekamutner.am/en/content.aspx?id=24'
  ]);

  /**
   * Test the Armenia example endpoint (legacy)
   */
  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/test-custom-url');
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Test a single URL directly using the new method
   */
  const testDirectUrl = async () => {
    if (!url) {
      setError('Please enter a URL to test');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/test-custom-url-direct?url=${encodeURIComponent(url)}`);
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a URL to the diagnostic list
   */
  const addDiagnosticUrl = () => {
    if (!url) {
      setError('Please enter a URL to add');
      return;
    }
    
    if (diagnosticUrls.includes(url)) {
      setError('This URL is already in the list');
      return;
    }
    
    setDiagnosticUrls([...diagnosticUrls, url]);
    setUrl('');
  };

  /**
   * Test all URLs in the diagnostic list
   */
  const runDiagnosticTests = async () => {
    setLoading(true);
    setError(null);
    
    const testResults = [];
    
    for (const testUrl of diagnosticUrls) {
      try {
        const response = await axios.get(`/api/test-custom-url-direct?url=${encodeURIComponent(testUrl)}`);
        testResults.push({
          url: testUrl,
          success: true,
          data: response.data
        });
      } catch (err: any) {
        testResults.push({
          url: testUrl,
          success: false,
          error: err.response?.data?.error || err.message || 'An error occurred'
        });
      }
    }
    
    setResults({
      diagnostic: true,
      results: testResults
    });
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Custom URL Diagnostic Tool</h2>
      <div className="mb-6">
        <div className="flex mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to test"
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={testDirectUrl}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
          >
            Test URL
          </button>
        </div>
        
        <div className="flex mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Add URL to diagnostic list"
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={addDiagnosticUrl}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r"
          >
            Add URL
          </button>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold mb-2">Diagnostic URL List:</h3>
          <ul className="list-disc pl-5">
            {diagnosticUrls.map((diagUrl, index) => (
              <li key={index} className="text-sm text-gray-700 mb-1">
                {diagUrl}
                <button 
                  className="ml-2 text-red-500 text-xs"
                  onClick={() => setDiagnosticUrls(diagnosticUrls.filter(u => u !== diagUrl))}
                >
                  (remove)
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={runDiagnosticTests}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Run Diagnostic Tests
          </button>
          
          <button
            onClick={runTest}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Run Legacy Test
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Testing URLs...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {results && !results.diagnostic && (
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-2">Test Results:</h3>
          <div className="bg-gray-100 p-4 rounded">
            <div className="mb-2">
              <span className="font-bold">URL:</span> {results.url}
            </div>
            <div className="mb-2">
              <span className="font-bold">Title:</span> {results.title}
            </div>
            <div className="mb-2">
              <span className="font-bold">Content Length:</span> {results.contentLength} characters
            </div>
            <div className="mb-4">
              <span className="font-bold">Content Preview:</span>
              <p className="whitespace-pre-wrap text-sm mt-1 bg-white p-2 rounded border">
                {results.contentPreview}
              </p>
            </div>
          </div>
        </div>
      )}

      {results && results.diagnostic && (
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-2">Diagnostic Results:</h3>
          <div className="space-y-4">
            {results.results.map((result: any, index: number) => (
              <div key={index} className={`p-4 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="font-bold mb-2">{result.url}</div>
                {result.success ? (
                  <>
                    <div className="text-green-700 mb-2">✓ Successfully fetched content</div>
                    <div className="mb-1">
                      <span className="font-semibold">Title:</span> {result.data.title}
                    </div>
                    <div className="mb-1">
                      <span className="font-semibold">Content Length:</span> {result.data.contentLength} characters
                    </div>
                    <div>
                      <span className="font-semibold">Preview:</span>
                      <p className="whitespace-pre-wrap text-sm mt-1 bg-white p-2 rounded border">
                        {result.data.contentPreview}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-red-700">
                    ✗ Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 