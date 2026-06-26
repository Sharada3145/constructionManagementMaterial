export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CONTRACTOR: 'contractor',
};

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  ISSUED: 'issued',
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-blue-100 text-blue-800';
    case 'partially_approved': return 'bg-indigo-100 text-indigo-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'issued': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-800';
    case 'medium': return 'bg-blue-100 text-blue-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'urgent': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};
