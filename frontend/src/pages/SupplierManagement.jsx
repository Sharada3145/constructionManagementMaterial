import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { MagnifyingGlassIcon, PlusIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { Dialog } from '@headlessui/react';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency } from '../utils/constants';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // History Modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySupplier, setHistorySupplier] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // Form state
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    gstNumber: '',
    rating: 3,
    materialsStr: '', // UI helper for comma separated materials
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedSupplier(null);
    setForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      gstNumber: '',
      rating: 3,
      materialsStr: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setIsEditMode(true);
    setSelectedSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      rating: supplier.rating || 3,
      materialsStr: supplier.materialsSupplied?.join(', ') || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      const res = await axiosInstance.delete(`/suppliers/${id}`);
      if (res.data.success) {
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...form,
      materialsSupplied: form.materialsStr.split(',').map(m => m.trim()).filter(Boolean),
    };

    try {
      if (isEditMode) {
        const res = await axiosInstance.put(`/suppliers/${selectedSupplier._id}`, payload);
        if (res.data.success) toast.success('Supplier updated successfully');
      } else {
        const res = await axiosInstance.post('/suppliers', payload);
        if (res.data.success) toast.success('Supplier added successfully');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} supplier`);
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryModal = async (supplier) => {
    setHistorySupplier(supplier);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await axiosInstance.get(`/transactions?type=purchase&supplier=${supplier._id}`);
      if (res.data.success) {
        setHistoryData(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load purchase history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<StarSolidIcon key={i} className="w-4 h-4 text-yellow-400" />);
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your material vendors and their contact details</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center justify-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Supplier
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search suppliers by name or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50">
          {loading ? (
            <div className="col-span-full py-10 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p>Loading suppliers...</p>
              </div>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <div key={supplier._id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{supplier.name}</h3>
                    <p className="text-sm text-slate-500">{supplier.gstNumber}</p>
                  </div>
                  {renderStars(supplier.rating)}
                </div>
                
                <div className="space-y-2 text-sm mb-4 flex-1">
                  <div className="flex text-slate-700">
                    <span className="font-medium w-20">Contact:</span>
                    <span className="flex-1">{supplier.contactPerson}</span>
                  </div>
                  <div className="flex text-slate-700">
                    <span className="font-medium w-20">Phone:</span>
                    <span className="flex-1">{supplier.phone}</span>
                  </div>
                  <div className="flex text-slate-700">
                    <span className="font-medium w-20">Email:</span>
                    <span className="flex-1 text-primary-600 truncate">{supplier.email}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Supplies</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.materialsSupplied?.length > 0 ? (
                      supplier.materialsSupplied.map((mat, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {mat}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No materials listed</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    onClick={() => openHistoryModal(supplier)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors mr-auto"
                  >
                    View History
                  </button>
                  <button 
                    onClick={() => openEditModal(supplier)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier._id)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-slate-500">No suppliers found.</div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Dialog open={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-slate-900/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {isEditMode ? 'Edit Supplier' : 'Add Supplier'}
              </Dialog.Title>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    value={form.contactPerson}
                    onChange={e => setForm({...form, contactPerson: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <input
                    required
                    type="tel"
                    className="input-field"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.gstNumber}
                    onChange={e => setForm({...form, gstNumber: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Materials Supplied <span className="text-xs font-normal text-slate-500">(comma separated)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cement, Bricks, Steel"
                  value={form.materialsStr}
                  onChange={e => setForm({...form, materialsStr: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="input-field"
                  value={form.rating}
                  onChange={e => setForm({...form, rating: Number(e.target.value)})}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* Purchase History Modal */}
      <Dialog open={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-slate-900/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  Purchase History
                </Dialog.Title>
                <p className="text-sm text-slate-500 mt-0.5">{historySupplier?.name}</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-500">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p>Loading history...</p>
                </div>
              ) : historyData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 px-4">Transaction ID</th>
                        <th className="pb-3 px-4">Material</th>
                        <th className="pb-3 px-4 text-right">Quantity</th>
                        <th className="pb-3 px-4 text-right">Unit Price</th>
                        <th className="pb-3 pl-4 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyData.map((txn) => (
                        <tr key={txn._id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 text-slate-500">{formatDate(txn.createdAt)}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{txn.transactionId}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900">{txn.material?.name || 'Unknown Material'}</span>
                            {txn.invoiceNumber && (
                              <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                Inv: {txn.invoiceNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            +{txn.quantity} <span className="text-xs font-normal text-slate-400">{txn.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency(txn.unitPrice)}
                          </td>
                          <td className="py-3 pl-4 text-right font-semibold text-slate-900">
                            {formatCurrency(txn.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <p>No purchase history found for this supplier.</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button onClick={() => setIsHistoryOpen(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;
