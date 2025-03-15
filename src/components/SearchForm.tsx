import { useState, FormEvent } from 'react';
import CustomUrlManager from './CustomUrlManager';

interface SearchFormProps {
  onSearch: (query: string, customUrls: string[], language: string) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [language, setLanguage] = useState('english');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() !== '') {
      onSearch(query, customUrls, language);
    }
  };

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish (Español)' },
    { value: 'french', label: 'French (Français)' },
    { value: 'german', label: 'German (Deutsch)' },
    { value: 'italian', label: 'Italian (Italiano)' },
    { value: 'portuguese', label: 'Portuguese (Português)' },
    { value: 'russian', label: 'Russian (Русский)' },
    { value: 'chinese', label: 'Chinese (中文)' },
    { value: 'japanese', label: 'Japanese (日本語)' },
    { value: 'korean', label: 'Korean (한국어)' },
    { value: 'arabic', label: 'Arabic (العربية)' },
    { value: 'hindi', label: 'Hindi (हिन्दी)' },
  ];

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label 
            htmlFor="query" 
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Research Question
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research question..."
            className="search-input"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <div>
          <label 
            htmlFor="language" 
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Search Language
          </label>
          <div className="flex items-center">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <div className="ml-2 text-sm text-gray-500">
              Results will be provided in English
            </div>
          </div>
        </div>
        
        <CustomUrlManager 
          onUrlsChange={setCustomUrls} 
          disabled={isLoading} 
        />
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="button-primary"
            disabled={isLoading || query.trim() === ''}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="loading-spinner mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Researching...
              </span>
            ) : (
              'Research'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 