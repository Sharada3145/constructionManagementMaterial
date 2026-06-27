import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BranchContext } from '../context/BranchContext';
import ReportsCenter from './ReportsCenter';
import AllBranchesReports from './AllBranchesReports';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const { activeBranchId } = useContext(BranchContext);

  // If Admin and in "All Branches" mode (no specific branch selected), show company reports
  if (user?.role === 'admin' && !activeBranchId) {
    return <AllBranchesReports />;
  }

  // Otherwise, show the branch-specific reports center
  return <ReportsCenter />;
};

export default ReportsPage;
