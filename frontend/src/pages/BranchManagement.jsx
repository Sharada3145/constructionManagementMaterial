import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { BranchContext } from '../context/BranchContext';
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

// ── Modal ────────────────────────────────────────────────────────────────────
const BranchModal = ({ branch, managers, onClose, onSaved }) => {
  const isEdit = !!branch?._id;
  const [form, setForm] = useState({
    branchName: branch?.branchName || '',
    location: branch?.location || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    managerId: branch?.managerId?._id || branch?.managerId || '',
    status: branch?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await axiosInstance.put(`/branches/${branch._id}`, form);
        toast.success('Branch updated successfully!');
      } else {
        await axiosInstance.post('/branches', form);
        toast.success('Branch created successfully!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Branch' : 'Create New Branch'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Branch Name *</label>
              <input
                className="input-field text-sm"
                required
                value={form.branchName}
                onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))}
                placeholder="e.g. Mumbai Branch"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">City / Location *</label>
              <input
                className="input-field text-sm"
                required
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Mumbai"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Address</label>
            <input
              className="input-field text-sm"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="123 Street, Area, City"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
              <input
                className="input-field text-sm"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
              <select
                className="input-field text-sm"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="deactive">Deactivated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Assign Manager</label>
            <select
              className="input-field text-sm"
              value={form.managerId}
              onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
            >
              <option value="">— No Manager Assigned —</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Branch' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const BranchManagement = () => {
  const { user } = useContext(AuthContext);
  const { branches, fetchBranches, loadingBranches } = useContext(BranchContext);
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalBranch, setModalBranch] = useState(undefined); // undefined = closed
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await axiosInstance.get('/users?role=manager');
      if (res.data.success) {
        setManagers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const handleToggleStatus = async (branch) => {
    setTogglingId(branch._id);
    try {
      await axiosInstance.patch(`/branches/${branch._id}/status`);
      toast.success(`Branch ${branch.status === 'active' ? 'deactivated' : 'activated'}`);
      await fetchBranches();
    } catch (err) {
      toast.error('Failed to update branch status');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredBranches = branches.filter(b =>
    b.branchName?.toLowerCase().includes(search.toLowerCase()) ||
    b.location?.toLowerCase().includes(search.toLowerCase())
  );

  const activeBranchCount = branches.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BuildingOffice2Icon className="w-7 h-7 text-primary-600" />
            Branch Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all company branches, locations, and assign branch managers.
          </p>
        </div>
        <button
          onClick={() => setModalBranch(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Add New Branch
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Branches', value: branches.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active Branches', value: activeBranchCount, color: 'bg-green-50 text-green-700' },
          { label: 'Deactivated', value: branches.length - activeBranchCount, color: 'bg-red-50 text-red-700' },
          { label: 'With Manager', value: branches.filter(b => b.managerId).length, color: 'bg-purple-50 text-purple-700' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold rounded-lg px-2 py-0.5 inline-block ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="input-field pl-9 text-sm"
          placeholder="Search branches..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Branch Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Manager</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingBranches ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading branches...</td></tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <BuildingOffice2Icon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No branches found</p>
                  </td>
                </tr>
              ) : filteredBranches.map(branch => (
                <tr key={branch._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                        {branch.branchName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{branch.branchName}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[150px]">{branch.address || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                      {branch.location}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      {branch.managerId?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                      {branch.phone || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      branch.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${branch.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {branch.status === 'active' ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(branch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalBranch(branch)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(branch)}
                        disabled={togglingId === branch._id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          branch.status === 'active'
                            ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={branch.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {branch.status === 'active'
                          ? <XCircleIcon className="w-4 h-4" />
                          : <CheckCircleIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalBranch !== undefined && (
        <BranchModal
          branch={modalBranch}
          managers={managers}
          onClose={() => setModalBranch(undefined)}
          onSaved={async () => {
            await fetchBranches();
            setModalBranch(undefined);
          }}
        />
      )}
    </div>
  );
};

export default BranchManagement;
