import { useState } from 'react';
import { SYSTEM_PROMPT, OPENAI_SYSTEM_PROMPT } from '../lib/api/systemPrompts';

export default function SystemPromptInfo() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'perplexity' | 'openai'>('perplexity');

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        System Prompts
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">System Prompts</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex border-b">
              <button 
                className={`px-4 py-2 ${activeTab === 'perplexity' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('perplexity')}
              >
                Perplexity & Serper
              </button>
              <button 
                className={`px-4 py-2 ${activeTab === 'openai' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('openai')}
              >
                OpenAI Summary
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                {activeTab === 'perplexity' ? SYSTEM_PROMPT : OPENAI_SYSTEM_PROMPT}
              </pre>
            </div>
            
            <div className="p-4 border-t flex justify-end">
              <div className="text-sm text-gray-500">
                <strong>Model Info:</strong> Perplexity uses Sonar-Pro, OpenAI uses GPT-4o for summarization
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 