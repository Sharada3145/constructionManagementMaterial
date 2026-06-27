import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (selectedBranch) {
      localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
    } else {
      localStorage.removeItem('selectedBranch');
    }
  }, [selectedBranch]);

  const fetchBranches = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      setLoadingBranches(true);
      const res = await axiosInstance.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  /**
   * The branchId to pass as a query parameter to API calls.
   * - Admin with a selected branch → that branch's ID
   * - Admin with no selection    → null (show all)
   * - Manager / Contractor        → their own branchId (from user object, handled server-side)
   */
  const activeBranchId = user?.role === 'admin' ? selectedBranch?._id || null : null;

  /**
   * Automatically attach the selected branch ID to all outgoing API requests.
   */
  useEffect(() => {
    if (activeBranchId) {
      axiosInstance.defaults.headers.common['x-branch-id'] = activeBranchId;
    } else {
      delete axiosInstance.defaults.headers.common['x-branch-id'];
    }
  }, [activeBranchId]);

  /**
   * Build ?branchId=xxx query string if admin has selected a specific branch.
   */
  const branchQuery = activeBranchId ? `branchId=${activeBranchId}` : '';

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranch,
      setSelectedBranch,
      loadingBranches,
      fetchBranches,
      activeBranchId,
      branchQuery,
    }}>
      {children}
    </BranchContext.Provider>
  );
};
