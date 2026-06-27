import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { BranchProvider, BranchContext } from './context/BranchContext';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import InventoryManagement from './pages/InventoryManagement';
import IssueMaterials from './pages/IssueMaterials';
import MyIssuedMaterials from './pages/MyIssuedMaterials';
import RequestApproval from './pages/RequestApproval';
import TransactionHistory from './pages/TransactionHistory';
import SupplierManagement from './pages/SupplierManagement';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ContractorAnalytics from './pages/ContractorAnalytics';
import ReportsPage from './pages/ReportsPage';
import BranchManagement from './pages/BranchManagement';
import AllBranchesDashboard from './pages/AllBranchesDashboard';

// Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const AdminDashboardRedirect = () => {
  const { activeBranchId } = useContext(BranchContext);
  if (activeBranchId) {
    return <Navigate to={`/admin/branches/${activeBranchId}/dashboard`} replace />;
  }
  return <Navigate to="/admin/branches" replace />;
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
      <Route path="/reset-password/:token" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />
      <Route path="/set-password/:token" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Default route based on role */}
        <Route index element={
          user?.role === 'contractor' ? <Navigate to="/my-issues" replace /> : 
          user?.role === 'admin' ? <AdminDashboardRedirect /> :
          <Dashboard />
        } />

        {/* Admin & Manager Routes */}
        <Route path="inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><InventoryManagement /></ProtectedRoute>} />
        <Route path="issue" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><IssueMaterials /></ProtectedRoute>} />
        <Route path="approvals" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RequestApproval /></ProtectedRoute>} />
        <Route path="transactions" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><TransactionHistory /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SupplierManagement /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="contractor-analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ContractorAnalytics /></ProtectedRoute>} />

        {/* Admin-only Routes */}
        <Route path="admin/branches" element={<ProtectedRoute allowedRoles={['admin']}><AllBranchesDashboard /></ProtectedRoute>} />
        <Route path="admin/branches/:branchId/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="branches" element={<ProtectedRoute allowedRoles={['admin']}><BranchManagement /></ProtectedRoute>} />

        {/* Contractor-only Route */}
        <Route path="my-issues" element={<ProtectedRoute allowedRoles={['contractor']}><MyIssuedMaterials /></ProtectedRoute>} />

        {/* Shared Routes */}
        <Route path="reports" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'contractor']}><ReportsPage /></ProtectedRoute>} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="flex h-screen flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to view this page.</p>
          <a href="/" className="btn-primary">Go Home</a>
        </div>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <BranchProvider>
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3000} />
        </BranchProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
