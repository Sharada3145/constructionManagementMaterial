import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CubeIcon } from '@heroicons/react/24/solid';

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* 3D Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-delayed"></div>
      
      <div className="absolute top-[20%] right-[15%] w-32 h-32 bg-gradient-to-tr from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl transform rotate-12 animate-float shadow-2xl"></div>
      <div className="absolute bottom-[30%] left-[10%] w-24 h-24 bg-gradient-to-tr from-primary-500/20 to-primary-400/10 backdrop-blur-md border border-white/10 rounded-full transform -rotate-12 animate-float-delayed shadow-xl"></div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl shadow-glow border border-white/20 flex items-center justify-center transform transition-transform hover:scale-110 duration-300">
            <CubeIcon className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-primary-200">
          Construction Material Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-in-right">
        <div className="bg-white/10 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 relative overflow-hidden group">
          
          {/* Glass shine effect */}
          <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-out"></div>

          {error && (
            <div className="mb-6 bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-100 px-4 py-3 rounded-lg relative shadow-inner" role="alert">
              <span className="block sm:inline text-sm font-medium">{error}</span>
            </div>
          )}

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-primary-100 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition-all duration-300 shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@construction.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-100 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition-all duration-300 shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-500 focus:ring-primary-400 border-white/30 bg-white/10 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-primary-200 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-primary-300 hover:text-white transition-colors duration-200 hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-glow text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-primary-900 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          
          <div className="mt-8 relative z-10 border-t border-white/10 pt-6">
            <p className="text-center text-xs text-primary-300 mb-3">Test Accounts:</p>
            <div className="flex justify-center space-x-4 text-xs font-mono">
              <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-primary-200">
                <span className="text-white font-bold">Admin:</span> admin@construction.com
              </div>
              <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-primary-200">
                <span className="text-white font-bold">Pass:</span> 123456
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
