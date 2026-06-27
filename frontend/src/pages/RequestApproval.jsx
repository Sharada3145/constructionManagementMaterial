import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { getStatusColor, getPriorityColor, formatDateTime } from '../utils/constants';
import { CheckCircleIcon, XCircleIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

const RequestApproval = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('issued');
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // For modal action
  const [actionNotes, setActionNotes] = useState('');
  const [editedItems, setEditedItems] = useState({});

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/requests${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`);
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status) => {
    if (!selectedRequest) return;
    
    try {
      // Build the items array if it's partially approved to pass modified quantities
      const itemsPayload = selectedRequest.items.map(item => ({
        _id: item._id,
        approvedQuantity: editedItems[item._id] !== undefined ? editedItems[item._id] : item.requestedQuantity
      }));

      const payload = {
        status,
        rejectionReason: status === 'rejected' ? actionNotes : undefined,
        items: status === 'partially_approved' ? itemsPayload : undefined
      };

      const res = await axiosInstance.put(`/requests/${selectedRequest._id}/status`, payload);
      
      if (res.data.success) {
        toast.success(`Request ${status.replace('_', ' ')} successfully`);
        setSelectedRequest(null);
        fetchRequests(); // refresh list
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const openReviewModal = (req) => {
    setSelectedRequest(req);
    setActionNotes('');
    
    // Initialize edited items with requested qty
    const initItems = {};
    req.items.forEach(item => {
      initItems[item._id] = item.requestedQuantity;
    });
    setEditedItems(initItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Issue History</h1>
        <div className="flex space-x-2 bg-white/60 backdrop-blur-sm p-1 rounded-lg border border-white/50 shadow-sm">
          <button 
            className={`px-3 py-1 text-sm rounded ${filterStatus === 'issued' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setFilterStatus('issued')}
          >
            Issued
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded ${filterStatus === 'all' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setFilterStatus('all')}
          >
            All Requests
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Req ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contractor / Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 divide-y divide-slate-100/80">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Loading requests...</td></tr>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.requestId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{req.contractor?.name}</div>
                      <div className="text-sm text-slate-500">{req.project?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDateTime(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusColor(req.status)}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openReviewModal(req)}
                        className="text-primary-600 hover:text-primary-900 flex items-center justify-end w-full"
                      >
                        <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-1" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    No requests found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedRequest(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white/95 backdrop-blur-xl rounded-2xl text-left overflow-hidden shadow-2xl border border-white/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
              
              <div className="bg-white/80 backdrop-blur-sm px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-100/80">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                      Review Request {selectedRequest.requestId}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Submitted by <span className="font-medium text-slate-700">{selectedRequest.contractor?.name}</span> on {formatDateTime(selectedRequest.createdAt)}
                    </p>
                  </div>
                  <span className={`badge ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-3 sm:px-6">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="font-medium text-slate-500">Project:</span> {selectedRequest.project?.name}</div>
                  <div><span className="font-medium text-slate-500">Priority:</span> <span className="capitalize">{selectedRequest.priority}</span></div>
                </div>
                {selectedRequest.notes && (
                  <div className="text-sm bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-white/50 mb-4">
                    <span className="font-medium text-slate-500 block mb-1">Contractor Notes:</span>
                    {selectedRequest.notes}
                  </div>
                )}

                <h4 className="font-medium text-slate-900 mb-2">Requested Items</h4>
                <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg overflow-hidden">
                  <table className="table-modern">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Material</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Current Stock</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Requested</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Approve Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedRequest.items.map(item => {
                        const inStock = item.material?.quantity || 0;
                        const reqQty = item.requestedQuantity;
                        const stockDanger = inStock < reqQty;

                        return (
                          <tr key={item._id}>
                            <td className="px-4 py-2 text-sm text-slate-900">{item.material?.name}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`font-medium ${stockDanger ? 'text-red-600' : 'text-green-600'}`}>
                                {inStock} {item.unit || item.material?.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-700 font-medium">{reqQty} {item.unit}</td>
                            <td className="px-4 py-2">
                              {selectedRequest.status === 'pending' ? (
                                <input 
                                  type="number" 
                                  className={`input-field py-1 px-2 w-24 text-sm ${stockDanger ? 'border-red-300 focus:ring-red-500' : ''}`}
                                  value={editedItems[item._id]}
                                  onChange={(e) => setEditedItems({...editedItems, [item._id]: Number(e.target.value)})}
                                  max={inStock}
                                />
                              ) : (
                                <span className="text-sm font-medium">{item.approvedQuantity || 0}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Approval/Rejection Notes</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Required for rejection, optional for approval..."
                    ></textarea>
                  </div>
                )}
              </div>

              <div className="bg-white/80 backdrop-blur-sm px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-100/80">
                {selectedRequest.status === 'pending' ? (
                  <>
                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleAction('approved')}>
                      <CheckCircleIcon className="w-5 h-5 mr-1" /> Approve & Issue
                    </button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleAction('partially_approved')}>
                      Partial Approve
                    </button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleAction('rejected')}>
                      <XCircleIcon className="w-5 h-5 mr-1" /> Reject
                    </button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm" onClick={() => setSelectedRequest(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm" onClick={() => setSelectedRequest(null)}>
                    Close
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestApproval;
