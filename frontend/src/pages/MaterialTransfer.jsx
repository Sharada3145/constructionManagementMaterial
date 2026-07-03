import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const MaterialTransfer = () => {
  const [branches, setBranches] = useState([]);
  const [warehouseMaterials, setWarehouseMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [toBranch, setToBranch] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ material: '', quantity: '', unit: '' }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch branches
      const branchRes = await axiosInstance.get('/branches');
      if (branchRes.data.success) {
        setBranches(branchRes.data.data.filter(b => !b.isCentralWarehouse && b.status === 'active'));
      }

      // Fetch warehouse ID and materials
      const whRes = await axiosInstance.get('/branches/warehouse');
      if (whRes.data.success && whRes.data.data) {
        const matRes = await axiosInstance.get('/materials', {
          headers: { 'x-branch-id': whRes.data.data._id }
        });
        if (matRes.data.success) {
          setWarehouseMaterials(matRes.data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load data for transfer:', error);
      toast.error('Failed to load required data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { material: '', quantity: '', unit: '' }]);
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill unit when material is selected
    if (field === 'material') {
      const selectedMat = warehouseMaterials.find(m => m._id === value);
      if (selectedMat) {
        newItems[index].unit = selectedMat.unit;
      }
    }
    
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toBranch) {
      return toast.error('Please select a destination branch');
    }
    
    const validItems = items.filter(i => i.material && i.quantity && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one valid material with quantity > 0');
    }

    // Validate quantities against warehouse stock
    for (const item of validItems) {
      const whMat = warehouseMaterials.find(m => m._id === item.material);
      if (whMat && Number(item.quantity) > whMat.quantity) {
        return toast.error(`Insufficient stock for ${whMat.name}. Available: ${whMat.quantity}`);
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        toBranch,
        notes,
        items: validItems.map(i => ({
          material: i.material,
          quantity: Number(i.quantity),
          unit: i.unit
        }))
      };

      const res = await axiosInstance.post('/transfers', payload);
      if (res.data.success) {
        toast.success('Materials transferred successfully');
        // Reset form
        setToBranch('');
        setNotes('');
        setItems([{ material: '', quantity: '', unit: '' }]);
        fetchData(); // Refresh warehouse stock
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer materials');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading modules...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Material Transfer</h1>
        <p className="text-sm text-slate-500">Distribute stock from Central Warehouse to Branches</p>
      </div>

      <div className="card p-6 bg-white/60 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">From</label>
              <div className="input-field bg-slate-100 text-slate-600 flex items-center h-10 cursor-not-allowed border border-slate-200">
                Central Warehouse
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">To Branch</label>
              <select
                required
                className="input-field"
                value={toBranch}
                onChange={(e) => setToBranch(e.target.value)}
              >
                <option value="">Select Destination Branch</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.branchName} - {b.location}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials to Transfer</label>
              <button type="button" onClick={addItem} className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex-1 w-full">
                    <select
                      required
                      className="input-field"
                      value={item.material}
                      onChange={(e) => handleItemChange(index, 'material', e.target.value)}
                    >
                      <option value="">Select Material</option>
                      {warehouseMaterials.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name} (Stock: {m.quantity} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      className="input-field"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <input
                      type="text"
                      readOnly
                      className="input-field bg-slate-100 text-slate-500 cursor-not-allowed"
                      placeholder="Unit"
                      value={item.unit}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transfer Notes / Reason</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Add any delivery instructions or reasons for transfer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center"
            >
              <PaperAirplaneIcon className="w-5 h-5 mr-2" />
              {submitting ? 'Transferring...' : 'Send Materials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialTransfer;
