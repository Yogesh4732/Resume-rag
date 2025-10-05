import React from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const ResumeCard = ({ resume, isRecruiter, onDownload }) => {
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      processing: { color: 'bg-yellow-100 text-yellow-800', text: 'Processing' },
      processed: { color: 'bg-green-100 text-green-800', text: 'Processed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    };

    const config = statusConfig[status] || statusConfig.processing;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <DocumentIcon className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {resume.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(resume.status)}
              <span className="text-xs text-gray-500">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                {formatDate(resume.uploaded_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Info */}
      {resume.status === 'processed' && resume.extractedData && (
        <div className="space-y-3 mb-4">
          {/* Name */}
          {resume.extractedData.name && (
            <div className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {isRecruiter ? resume.extractedData.name : '[REDACTED]'}
              </span>
            </div>
          )}

          {/* Email */}
          {resume.extractedData.email && (
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {isRecruiter ? resume.extractedData.email : '[REDACTED]'}
              </span>
            </div>
          )}

          {/* Phone */}
          {resume.extractedData.phone && (
            <div className="flex items-center space-x-2">
              <PhoneIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {isRecruiter ? resume.extractedData.phone : '[REDACTED]'}
              </span>
            </div>
          )}

          {/* Skills */}
          {resume.extractedData.skills && resume.extractedData.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {resume.extractedData.skills.slice(0, 6).map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
                {resume.extractedData.skills.length > 6 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    +{resume.extractedData.skills.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Latest Experience */}
          {resume.extractedData.experience && resume.extractedData.experience.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Latest Experience</h4>
              <p className="text-sm text-gray-600">
                {resume.extractedData.experience[0].position} at {resume.extractedData.experience[0].company}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Processing Status */}
      {resume.status === 'processing' && (
        <div className="mb-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Resume is being processed...</p>
        </div>
      )}

      {/* Error Status */}
      {resume.status === 'failed' && (
        <div className="mb-4">
          <p className="text-sm text-red-600">
            Processing failed: {resume.error || 'Unknown error'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link
          to={`/candidates/${resume.id}`}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <EyeIcon className="h-4 w-4 mr-1.5" />
          View Details
        </Link>

        {isRecruiter && resume.status === 'processed' && (
          <button
            onClick={() => onDownload(resume.id, resume.name)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
            Download
          </button>
        )}
      </div>
    </div>
  );
};

export default ResumeCard;
