import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthData, clearAuthData, getCurrentUser, getAuthToken } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getAuthToken();
        const savedUser = getCurrentUser();
        
        if (token && savedUser) {
          // Verify token is still valid by fetching fresh user data
          try {
            const response = await authAPI.getProfile();
            setUser(response.user);
          } catch (error) {
            // Token is invalid, clear auth data
            clearAuthData();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);
      const { user: userData, token } = response;
      
      setAuthData(token, userData);
      setUser(userData);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      const { user: newUser, token } = response;
      
      setAuthData(token, newUser);
      setUser(newUser);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
  };

  const updateUser = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.user;
      
      // Update stored user data
      setAuthData(getAuthToken(), updatedUser);
      setUser(updatedUser);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const isRecruiter = () => {
    return user?.isRecruiter || false;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isRecruiter
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
