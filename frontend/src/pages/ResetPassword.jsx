import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { BuildingOfficeIcon } from '@heroicons/react/24/solid';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialSet = location.pathname.includes('/set-password');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return toast.error("Passwords don't match");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const res = await axiosInstance.put(`/auth/resetpassword/${token}`, { password });
      if (res.data.success) {
        toast.success(isInitialSet ? 'Account setup complete! Please log in.' : 'Password reset successful! Please log in.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary-600">
          <BuildingOfficeIcon className="h-12 w-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          {isInitialSet ? 'Set Up Your Account' : 'Create New Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isInitialSet 
            ? 'Welcome! Please create a secure password to activate your account.'
            : 'Enter a new password for your account.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400"
              >
                {loading ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
