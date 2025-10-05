import React, { useState } from 'react';
import { useMutation } from 'react-query';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { askAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AskPage = () => {
  const [query, setQuery] = useState('');
  const [k, setK] = useState(5);
  const [results, setResults] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const { isRecruiter } = useAuth();

  const askMutation = useMutation(
    ({ query, k }) => askAPI.query(query, k),
    {
      onSuccess: (data) => {
        setResults(data.results || []);
        setQueryHistory(prev => [
          { query, timestamp: new Date(), results: data.results.length },
          ...prev.slice(0, 9) // Keep last 10 queries
        ]);
        toast.success(`Found ${data.results.length} relevant results`);
      },
      onError: (error) => {
        toast.error('Query failed. Please try again.');
        console.error('Ask query error:', error);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Please enter a question');
      return;
    }
    askMutation.mutate({ query: query.trim(), k });
  };

  const handleHistoryClick = (historicalQuery) => {
    setQuery(historicalQuery);
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(timestamp);
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Ask Questions</h1>
        <p className="text-gray-600">
          Ask questions about the uploaded resumes. Get evidence-backed answers with relevant snippets.
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <div className="relative">
              <ChatBubbleLeftRightIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Who has experience with React and Node.js? Which candidates have worked at startups?"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label htmlFor="k" className="text-sm font-medium text-gray-700">
                Max Results:
              </label>
              <select
                id="k"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={askMutation.isLoading || !query.trim()}
              className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {askMutation.isLoading ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Ask Question
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="space-y-2">
              {queryHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate pr-4">
                      {item.query}
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{item.results} results</span>
                      <ClockIcon className="h-3 w-3" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Results ({results.length})
            </h2>
            <p className="text-sm text-gray-600">
              Showing evidence-backed answers
            </p>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Resume {result.resume_id}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          Match Score: {(result.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/candidates/${result.resume_id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Full Resume →
                  </a>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Relevant Excerpt:
                  </h4>
                  <p 
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(result.snippet, query)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !askMutation.isLoading && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions asked yet</h3>
          <p className="text-gray-600 mb-6">
            Ask a question about the uploaded resumes to get started.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="font-medium text-blue-900 mb-2">Example Questions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• "Who has experience with Python and machine learning?"</li>
              <li>• "Which candidates have worked at Fortune 500 companies?"</li>
              <li>• "Show me resumes with React and Node.js skills"</li>
              <li>• "Who has a PhD in Computer Science?"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskPage;
