import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resumeAPI, jobAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CandidatePage = () => {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobMatches, setJobMatches] = useState([]);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const data = await resumeAPI.getById(id);
        setResume(data);
      } catch {
        setResume(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [id]);

  // Optionally fetch job matches for this candidate
  useEffect(() => {
    const fetchJobMatches = async () => {
      try {
        const jobsRes = await jobAPI.list();
        const jobs = jobsRes.items || [];
        // For each job, check match
        const matches = [];
        for (const job of jobs) {
          try {
            const matchRes = await jobAPI.match(job.id, 1);
            if (matchRes.matches && matchRes.matches.length > 0 && matchRes.matches[0].resume_id === id)
              matches.push({ job, ...matchRes.matches[0] });
          } catch { }
        }
        setJobMatches(matches);
      } catch (err) {}
    };
    fetchJobMatches();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!resume) return <div className="max-w-xl mx-auto py-8">Resume not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.name}</h1>
      <p className="text-sm text-gray-500 mb-8">Resume ID: {resume.id}</p>
      {resume.extractedData && (
        <div className="space-y-3">
          <div><strong>Name:</strong> {resume.extractedData.name || '[REDACTED]'}</div>
          <div><strong>Email:</strong> {resume.extractedData.email || '[REDACTED]'}</div>
          <div><strong>Phone:</strong> {resume.extractedData.phone || '[REDACTED]'}</div>
          <div><strong>Skills:</strong> {resume.extractedData.skills?.join(', ')}</div>
          <div><strong>Experience:</strong>
            <ul className="list-disc ml-4">
              {resume.extractedData.experience?.map((exp, idx) => (
                <li key={idx}>
                  {exp.position} at {exp.company} ({exp.startDate} - {exp.endDate})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <hr className="my-8"/>
      <h2 className="text-lg font-semibold mb-3">Job Matches for Candidate</h2>
      {jobMatches.length === 0 ? (
        <div>No jobs matched for this candidate yet.</div>
      ) : (
        <ul className="list-disc ml-4">
          {jobMatches.map((match, idx) => (
            <li key={idx}>
              <strong>{match.job.title}</strong> - Match Score: {(match.score * 100).toFixed(1)}%, Missing: {match.missing_requirements.join(', ')}
              <div className="text-gray-500 text-sm">Evidence: {JSON.stringify(match.evidence)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CandidatePage;
