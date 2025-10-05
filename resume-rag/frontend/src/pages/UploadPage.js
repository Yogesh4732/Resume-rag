import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { resumeAPI } from '../utils/api';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation(resumeAPI.upload, {
    onSuccess: (data) => {
      setUploadResults(data.items);
      queryClient.invalidateQueries('resumes');
      toast.success(`Successfully uploaded ${data.items.length} files`);
    },
    onError: (error) => {
      toast.error('Upload failed. Please try again.');
      console.error('Upload error:', error);
    }
  });

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach(error => {
        if (error.code === 'file-invalid-type') {
          toast.error(`${file.name}: Only PDF, DOCX, and ZIP files are allowed`);
        } else if (error.code === 'file-too-large') {
          toast.error(`${file.name}: File size must be less than 50MB`);
        }
      });
    });

    // Add accepted files to state
    const filesWithId = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setFiles(prev => [...prev, ...filesWithId]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    const fileObjects = files.map(f => f.file);
    uploadMutation.mutate(fileObjects);
  };

  const clearResults = () => {
    setUploadResults([]);
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResults([]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Resumes</h1>
          <p className="text-gray-600">
            Upload PDF, DOCX files, or ZIP archives containing multiple resumes. 
            Files will be automatically parsed and indexed for search.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: PDF, DOCX, ZIP (up to 50MB each)
              </p>
            </div>
          )}
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Selected Files ({files.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isLoading}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                      {uploadMutation.isLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="-ml-1 mr-2 h-4 w-4" />
                    Upload Files
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Results
              </h3>
              <button
                onClick={clearResults}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Clear Results
              </button>
            </div>
            
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {result.status === 'processed' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : result.status === 'failed' ? (
                      <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <ArrowPathIcon className="h-6 w-6 text-yellow-500 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{result.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        Status: {result.status}
                      </p>
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
