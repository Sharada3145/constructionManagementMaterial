import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axiosInstance, { setActiveBranchHeader } from '../api/axiosInstance';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedBranch');
      const branch = saved ? JSON.parse(saved) : null;
      // Only restore if the admin explicitly chose this branch (flagged via 'userChoseBranch')
      const userChose = localStorage.getItem('userChoseBranch') === 'true';
      if (branch?._id && userChose) {
        setActiveBranchHeader(branch._id);
        return branch;
      }
      // Otherwise start in "All Branches" mode
      localStorage.removeItem('selectedBranch');
      localStorage.removeItem('userChoseBranch');
      return null;
    } catch {
      return null;
    }
  });
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (selectedBranch) {
      localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
      // Mark that user explicitly chose this branch
      localStorage.setItem('userChoseBranch', 'true');
    } else {
      localStorage.removeItem('selectedBranch');
      localStorage.removeItem('userChoseBranch');
    }
  }, [selectedBranch]);

  const fetchBranches = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      setLoadingBranches(true);
      const res = await axiosInstance.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
        // Do NOT auto-select; let admin stay in "All Branches" mode on first load
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
   * Automatically sync the selected branch ID for all outgoing API requests.
   */
  useEffect(() => {
    setActiveBranchHeader(activeBranchId);
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
