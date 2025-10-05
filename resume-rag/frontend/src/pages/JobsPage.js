import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from 'react-query';
import { useInView } from 'react-intersection-observer';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { jobAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import JobCard from '../components/JobCard';
import JobForm from '../components/JobForm';
import JobMatchModal from '../components/JobMatchModal';
import toast from 'react-hot-toast';

const JobsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery(
    ['jobs', searchQuery],
    ({ pageParam = 0 }) =>
      jobAPI.list({
        limit: 10,
        offset: pageParam,
        q: searchQuery
      }),
    {
      getNextPageParam: (lastPage) => lastPage.next_offset,
      staleTime: 30000,
    }
  );

  const createJobMutation = useMutation(jobAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('jobs');
      setShowJobForm(false);
      toast.success('Job created successfully!');
    },
    onError: (error) => {
      const msg = error?.response?.data?.error?.message || 'Failed to create job';
      toast.error(msg);
      console.error('Job creation error:', error);
    }
  });

  const deleteJobMutation = useMutation(jobAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('jobs');
      toast.success('Job deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete job');
      console.error('Job deletion error:', error);
    }
  });

  // Load more when scrolling to bottom
  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const allJobs = data?.pages?.flatMap(page => page.items) || [];

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  const handleCreateJob = (jobData) => {
    createJobMutation.mutate(jobData);
  };

  const handleDeleteJob = (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      deleteJobMutation.mutate(jobId);
    }
  };

  const handleMatchJob = (job) => {
    setSelectedJob(job);
    setShowMatchModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Jobs</h1>
            <p className="text-gray-600">
              Manage job postings and find the best candidates.
            </p>
          </div>
          <button
            onClick={() => setShowJobForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Job
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs by title, company, skills..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
      </div>

      {/* Job Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading jobs</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : allJobs.length === 0 ? (
        <div className="text-center py-12">
          <BriefcaseIcon className="mx-auto h-8 w-8 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? `No jobs match your search for "${searchQuery}"`
              : 'No jobs have been created yet'}
          </p>
          <button
            onClick={() => setShowJobForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create First Job
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {allJobs.length} jobs
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {allJobs.map((job, index) => (
              <JobCard
                key={`${job.id}-${index}`}
                job={job}
                currentUserId={user?.id}
                onDelete={handleDeleteJob}
                onMatch={handleMatchJob}
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

      {/* Job Creation Form Modal */}
      {showJobForm && (
        <JobForm
          onSubmit={handleCreateJob}
          onCancel={() => setShowJobForm(false)}
          loading={createJobMutation.isLoading}
        />
      )}

      {/* Job Matching Modal */}
      {showMatchModal && selectedJob && (
        <JobMatchModal
          job={selectedJob}
          onClose={() => {
            setShowMatchModal(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default JobsPage;
