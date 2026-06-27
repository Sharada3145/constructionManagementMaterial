import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency } from '../utils/constants';
import { MagnifyingGlassIcon, PlusIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const CATEGORIES = [
  'Cement & Concrete',
  'Sand & Aggregates',
  'Bricks & Blocks',
  'Steel & Iron',
  'Tiles & Flooring',
  'Paint & Coatings',
  'Pipes & Fittings',
  'Electrical',
  'Wood & Timber',
  'Plumbing',
  'Hardware',
  'Other',
];

const UNITS = ['kg', 'bags', 'tonnes', 'pieces', 'meters', 'liters', 'cubic_meters', 'sq_ft', 'bundles'];

const InventoryManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, low_stock

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Add/Edit
  const [materialForm, setMaterialForm] = useState({
    name: '',
    category: CATEGORIES[0],
    unit: UNITS[0],
    quantity: 0,
    minStockLevel: 10,
    supplier: '',
    purchasePrice: 0,
    description: '',
    location: '',
  });

  // Form states - Restock
  const [restockForm, setRestockForm] = useState({
    quantity: '',
    supplier: '',
    invoiceNumber: '',
    unitPrice: '',
    notes: '',
  });

  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
  }, [filter]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      let url = '/materials';
      if (filter === 'low_stock') {
        url = '/materials/low-stock';
      }
      const res = await axiosInstance.get(url);
      if (res.data.success) {
        setMaterials(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axiosInstance.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  // Open modal to Add Material
  const openAddModal = () => {
    setIsAddMode(true);
    setMaterialForm({
      name: '',
      category: CATEGORIES[0],
      unit: UNITS[0],
      quantity: 0,
      minStockLevel: 10,
      supplier: suppliers[0]?._id || '',
      purchasePrice: 0,
      description: '',
      location: '',
    });
    setIsAddEditOpen(true);
  };

  // Open modal to Edit Material
  const openEditModal = (material) => {
    setIsAddMode(false);
    setSelectedMaterial(material);
    setMaterialForm({
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity: material.quantity,
      minStockLevel: material.minStockLevel,
      supplier: material.supplier?._id || material.supplier || '',
      purchasePrice: material.purchasePrice,
      description: material.description || '',
      location: material.location || '',
    });
    setIsAddEditOpen(true);
  };

  // Open modal to Restock Material
  const openRestockModal = (material) => {
    setSelectedMaterial(material);
    setRestockForm({
      quantity: '',
      supplier: material.supplier?._id || material.supplier || '',
      invoiceNumber: '',
      unitPrice: material.purchasePrice || '',
      notes: '',
    });
    setIsRestockOpen(true);
  };

  // Handle Add/Edit Form Submission
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (isAddMode) {
        res = await axiosInstance.post('/materials', materialForm);
      } else {
        res = await axiosInstance.put(`/materials/${selectedMaterial._id}`, materialForm);
      }

      if (res.data.success) {
        toast.success(isAddMode ? 'Material created successfully' : 'Material updated successfully');
        setIsAddEditOpen(false);
        fetchMaterials();
      }
    } catch (error) {
      console.error("Material save failed:", error);
      toast.error(error.response?.data?.message || 'Failed to save material');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Restock Form Submission
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockForm.quantity || Number(restockForm.quantity) <= 0) {
      toast.error('Please enter a valid restock quantity');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        material: selectedMaterial._id,
        quantity: Number(restockForm.quantity),
        unit: selectedMaterial.unit,
        supplier: restockForm.supplier || null,
        invoiceNumber: restockForm.invoiceNumber,
        unitPrice: restockForm.unitPrice ? Number(restockForm.unitPrice) : undefined,
        notes: restockForm.notes,
      };

      const res = await axiosInstance.post('/transactions/purchase', payload);
      if (res.data.success) {
        toast.success('Restock purchase recorded and stock updated');
        setIsRestockOpen(false);
        fetchMaterials();
      }
    } catch (error) {
      console.error("Restock failed:", error);
      toast.error(error.response?.data?.message || 'Failed to restock material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        <button 
          onClick={openAddModal}
          className="btn-primary flex items-center justify-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Material
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100/80 flex flex-col sm:flex-row gap-4 justify-between bg-white/60 backdrop-blur-sm">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border border-slate-300 rounded-l-md ${filter === 'all' ? 'bg-slate-100 text-slate-900 z-10 ring-1 ring-primary-500 border-primary-500' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setFilter('low_stock')}
              className={`px-4 py-2 text-sm font-medium border border-l-0 border-slate-300 rounded-r-md ${filter === 'low_stock' ? 'bg-slate-100 text-slate-900 z-10 ring-1 ring-primary-500 border-primary-500' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              Low Stock Alerts
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Material Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Level</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price (Unit)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 divide-y divide-slate-100/80">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Loading inventory...</td></tr>
              ) : filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => (
                  <tr key={material._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{material.name}</div>
                          <div className="text-sm text-slate-500 truncate max-w-[200px]">{material.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {material.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-bold ${material.quantity <= material.minStockLevel ? 'text-red-600' : 'text-slate-900'}`}>
                          {material.quantity} {material.unit}
                        </span>
                        {material.quantity <= material.minStockLevel && (
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500 ml-2" title="Low Stock!" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Min: {material.minStockLevel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(material.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {material.supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openEditModal(material)}
                        className="text-primary-600 hover:text-primary-900 mr-4 font-semibold"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => openRestockModal(material)}
                        className="text-emerald-600 hover:text-emerald-900 font-semibold"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    No materials found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Material Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {isAddMode ? 'Add New Material' : `Edit Material: ${selectedMaterial?.name}`}
              </h2>
              <button onClick={() => setIsAddEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleMaterialSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Material Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. OPC 53 Grade Cement"
                    value={materialForm.name}
                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="input-field"
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unit Type</label>
                  <select
                    className="input-field"
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                  >
                    {UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {isAddMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Initial Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input-field"
                      placeholder="0"
                      value={materialForm.quantity}
                      onChange={(e) => setMaterialForm({ ...materialForm, quantity: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Min Stock Level (Alert Threshold)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-field"
                    placeholder="10"
                    value={materialForm.minStockLevel}
                    onChange={(e) => setMaterialForm({ ...materialForm, minStockLevel: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Purchase Price per Unit (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={materialForm.purchasePrice}
                    onChange={(e) => setMaterialForm({ ...materialForm, purchasePrice: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Default Supplier</label>
                  <select
                    className="input-field"
                    value={materialForm.supplier}
                    onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                  >
                    <option value="">No Supplier Assigned</option>
                    {suppliers.map(sup => (
                      <option key={sup._id} value={sup._id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Storage Location</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Warehouse A - Section 2"
                    value={materialForm.location}
                    onChange={(e) => setMaterialForm({ ...materialForm, location: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    className="input-field min-h-[80px]"
                    placeholder="Material details, specifications, etc."
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100/80 flex items-center justify-end gap-3 bg-white/60 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Saving...' : isAddMode ? 'Create Material' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Material Modal */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Restock Material</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedMaterial?.name} (Current: {selectedMaterial?.quantity} {selectedMaterial?.unit})</p>
              </div>
              <button onClick={() => setIsRestockOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Restock Quantity ({selectedMaterial?.unit})</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  className="input-field"
                  placeholder={`Enter quantity in ${selectedMaterial?.unit}`}
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Number / Purchase Reference</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. INV-2026-1049"
                  value={restockForm.invoiceNumber}
                  onChange={(e) => setRestockForm({ ...restockForm, invoiceNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unit Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder={selectedMaterial?.purchasePrice ? `${selectedMaterial.purchasePrice} (Current)` : "0.00"}
                  value={restockForm.unitPrice}
                  onChange={(e) => setRestockForm({ ...restockForm, unitPrice: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to retain current purchase price of {formatCurrency(selectedMaterial?.purchasePrice || 0)} per unit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Supplier</label>
                <select
                  className="input-field"
                  value={restockForm.supplier}
                  onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
                >
                  <option value="">No Supplier / Directly Purchased</option>
                  {suppliers.map(sup => (
                    <option key={sup._id} value={sup._id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Transaction Notes</label>
                <textarea
                  className="input-field min-h-[60px]"
                  placeholder="Additional notes about this batch, quality, delivery details, etc."
                  value={restockForm.notes}
                  onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100/80 flex items-center justify-end gap-3 bg-white/60 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700"
                >
                  {submitting ? 'Recording...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;

