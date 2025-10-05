import React, { useState } from 'react';
import toast from 'react-hot-toast';

const JobForm = ({ onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    company: '',
    skillsRequired: [],
    location: ''
  });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    // Basic client-side validation to avoid backend 400s
    if (!form.title || form.title.trim().length === 0) {
      toast.error('Job title is required');
      return;
    }
    if (!form.description || form.description.trim().length < 10) {
      toast.error('Job description must be at least 10 characters');
      return;
    }
    onSubmit(form);
  };
  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-xl w-full">
        <h2 className="text-xl font-bold mb-4">Create Job</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input name="title" required placeholder="Job Title" onChange={handleChange} className="w-full p-2 border rounded"/>
          <input name="company" required placeholder="Company" onChange={handleChange} className="w-full p-2 border rounded"/>
          <input name="location" required placeholder="Location" onChange={handleChange} className="w-full p-2 border rounded"/>
          <input name="skillsRequired" placeholder="Skills (comma separated)" onChange={e => setForm(prev => ({...prev, skillsRequired: e.target.value.split(',').map(s => s.trim())}))} className="w-full p-2 border rounded"/>
          <textarea name="description" required placeholder="Job Description" onChange={handleChange} className="w-full p-2 border rounded"/>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onCancel} className="text-gray-700 px-4 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Creating...' : 'Create Job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobForm;
