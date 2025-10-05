import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
      return;
    }
    
    if (error.response?.status === 429) {
      toast.error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.data?.error?.message) {
      toast.error(error.response.data.error.message);
    } else if (error.message) {
      toast.error(error.message);
    }
    
    return Promise.reject(error);
  }
);

// Generate unique idempotency key
const generateIdempotencyKey = () => {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData, {
      headers: { 'Idempotency-Key': generateIdempotencyKey() }
    });
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  }
};

// Resume API
export const resumeAPI = {
  upload: async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': generateIdempotencyKey()
      },
      timeout: 120000, // 2 minutes for large files
    });
    return response.data;
  },
  
  list: async (params = {}) => {
    const { limit = 10, offset = 0, q = '' } = params;
    const response = await api.get('/resumes', {
      params: { limit, offset, q }
    });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/resumes/${id}`);
    return response.data;
  },
  
  download: async (id) => {
    const response = await api.get(`/resumes/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/resumes/${id}`);
    return response.data;
  }
};

// Job API
export const jobAPI = {
  create: async (jobData) => {
    const response = await api.post('/jobs', jobData, {
      headers: { 'Idempotency-Key': generateIdempotencyKey() }
    });
    return response.data;
  },
  
  list: async (params = {}) => {
    const { limit = 10, offset = 0, q = '' } = params;
    const response = await api.get('/jobs', {
      params: { limit, offset, q }
    });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  
  update: async (id, jobData) => {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
  
  match: async (id, top_n = 10) => {
    const response = await api.post(`/jobs/${id}/match`, { top_n });
    return response.data;
  }
};

// Ask API
export const askAPI = {
  query: async (query, k = 5) => {
    const response = await api.post('/ask', { query, k });
    return response.data;
  }
};

// Utils
export const getAuthToken = () => Cookies.get('token');
export const getCurrentUser = () => {
  const userStr = Cookies.get('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setAuthData = (token, user) => {
  Cookies.set('token', token, { expires: 7 }); // 7 days
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
};

export const clearAuthData = () => {
  Cookies.remove('token');
  Cookies.remove('user');
};

export default api;
