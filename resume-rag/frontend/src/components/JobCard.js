import React from 'react';

const JobCard = ({ job, currentUserId, onDelete, onMatch }) => (
  <div className="bg-white rounded-lg shadow p-6 mb-4 card-hover">
    <h3 className="text-lg font-bold text-gray-900 mb-2">{job.title}</h3>
    <p className="text-sm text-gray-600 mb-2">{job.company} — {job.location}</p>
    <p className="text-gray-700 mb-2">{job.description}</p>
    <div className="flex justify-between mt-4">
      <button className="text-blue-700 font-semibold" onClick={() => onMatch(job)}>Match</button>
      {currentUserId && job.created_by && job.created_by.id === currentUserId && (
        <button className="text-red-700 font-semibold" onClick={() => onDelete(job.id)}>Delete</button>
      )}
    </div>
  </div>
);

export default JobCard;
