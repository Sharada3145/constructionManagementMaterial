import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and fetch user details
          const response = await axiosInstance.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.data);
          }
        } catch (error) {
          console.error("Auth init error:", error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for unauthorized events from axios interceptor
    const handleAuthError = () => {
      setUser(null);
      toast.error('Session expired. Please log in again.');
    };
    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        setUser(response.data.data);
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
