import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    company: user?.company || ''
  });
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleChange = e => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(formData);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Profile</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          name="firstName"
          type="text"
          placeholder="First name"
          value={formData.firstName}
          onChange={handleChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded"
        />
        <input
          name="lastName"
          type="text"
          placeholder="Last name"
          value={formData.lastName}
          onChange={handleChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded"
        />
        <input
          name="company"
          type="text"
          placeholder="Company/faculty"
          value={formData.company}
          onChange={handleChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded font-semibold"
        >
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
