import React, { useEffect, useState } from 'react';
import { jobAPI } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

const JobMatchModal = ({ job, onClose }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await jobAPI.match(job.id, 10);
        setMatches(res.matches || []);
      } catch { setMatches([]); }
      finally { setLoading(false); }
    };
    fetchMatches();
  }, [job.id]);

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-3xl w-full relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>Close</button>
        <h2 className="text-lg font-bold mb-4">Top Candidates for: {job.title}</h2>
        {loading ? <LoadingSpinner /> : matches.length === 0 ? (
          <div>No matching candidates found.</div>
        ) : (
          <ul className="space-y-4">
            {matches.map((match, idx) => (
              <li key={idx} className="border p-4 rounded">
                <div>
                  <strong>Name:</strong> {match.candidate_name}<br/>
                  <strong>Score:</strong> {(match.score * 100).toFixed(1)}%<br/>
                  <strong>Missing:</strong> {match.missing_requirements.join(', ')}
                </div>
                <div className="text-gray-600 text-sm">Evidence: {JSON.stringify(match.evidence)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JobMatchModal;
