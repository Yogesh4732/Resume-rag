import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useInView } from 'react-intersection-observer';
import {
  MagnifyingGlassIcon,
  DocumentIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { resumeAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ResumeCard from '../components/ResumeCard';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { isRecruiter } = useAuth();
  const { ref, inView } = useInView();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery(
    ['resumes', debouncedQuery],
    ({ pageParam = 0 }) =>
      resumeAPI.list({
        limit: 10,
        offset: pageParam,
        q: debouncedQuery
      }),
    {
      getNextPageParam: (lastPage) => lastPage.next_offset,
      staleTime: 30000, // 30 seconds
    }
  );

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const allResumes = data?.pages?.flatMap(page => page.items) || [];

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  const handleDownload = async (resumeId, filename) => {
    try {
      const response = await resumeAPI.download(resumeId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Resumes</h1>
        <p className="text-gray-600 mb-6">
          Search through uploaded resumes by skills, experience, education, or keywords.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by skills, experience, company, education..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
      </div>

      {/* Search Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading resumes</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : allResumes.length === 0 ? (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-8 w-8 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes found</h3>
          <p className="text-gray-600 mb-4">
            {debouncedQuery
              ? `No resumes match your search for "${debouncedQuery}"`
              : 'No resumes have been uploaded yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {allResumes.length} resumes
              {debouncedQuery && ` for "${debouncedQuery}"`}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allResumes.map((resume, index) => (
              <ResumeCard
                key={`${resume.id}-${index}`}
                resume={resume}
                isRecruiter={isRecruiter()}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {/* Loading more indicator */}
          {(hasNextPage || isFetchingNextPage) && (
            <div ref={ref} className="flex justify-center py-8">
              {isFetchingNextPage ? (
                <LoadingSpinner />
              ) : (
                <p className="text-gray-500">Scroll to load more...</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
