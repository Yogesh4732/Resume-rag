import React from 'react';
import { BriefcaseIcon, MagnifyingGlassIcon, CloudArrowUpIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const features = [
  {
    name: 'Upload Resumes',
    description: 'Bulk upload PDF, DOCX, and ZIP resumé files.',
    to: '/upload',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Search & Filter',
    description: 'Find candidates by skills, experience, education, and more.',
    to: '/search',
    icon: MagnifyingGlassIcon,
  },
  {
    name: 'Job Matching',
    description: 'Match resumes against job descriptions using AI ranking.',
    to: '/jobs',
    icon: BriefcaseIcon,
  },
  {
    name: 'Ask Questions',
    description: 'Query all resumes for answers—with snippet evidence.',
    to: '/ask',
    icon: ChatBubbleLeftRightIcon,
  },
];

const HomePage = () => (
  <div className="max-w-4xl mx-auto py-8 px-4">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to ResumeRAG</h1>
    <p className="text-gray-700 mb-8">
      Smart resume parsing, searching, Q&A, and job-candidate matching.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {features.map((feature) => (
        <Link
          to={feature.to}
          key={feature.name}
          className="block bg-white rounded-lg shadow card-hover px-6 py-8 text-center group"
        >
          <feature.icon className="h-4 w-4 mx-auto text-blue-500 mb-3" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">{feature.name}</h3>
          <p className="text-sm text-gray-600">{feature.description}</p>
        </Link>
      ))}
    </div>
  </div>
);

export default HomePage;
