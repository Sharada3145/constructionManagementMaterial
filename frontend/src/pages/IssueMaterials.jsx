import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  UserIcon,
  CheckCircleIcon,
  UserPlusIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import useReportDownload from '../hooks/useReportDownload';

const IssueMaterials = () => {
  const { user } = useContext(AuthContext);
  const { downloadIssueReport, isDownloading } = useReportDownload();
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Existing vs New Contractor Toggle
  const [isNewContractor, setIsNewContractor] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState('');
  const [newContractor, setNewContractor] = useState({ name: '', email: '', phone: '' });

  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successRecord, setSuccessRecord] = useState(null);
  const [items, setItems] = useState([
    { id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false },
  ]);

  const fetchContractors = async () => {
    try {
      const res = await axiosInstance.get('/requests/users?role=contractor');
      if (res.data.success) setContractors(res.data.data);
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes] = await Promise.all([
          axiosInstance.get('/projects'),
          fetchContractors()
        ]);
        if (pRes.data.success) setProjects(pRes.data.data);
      } catch (error) {
        console.error('Failed to fetch init data:', error);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false }]);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, [field]: value, matchedMaterial: field === 'materialName' ? null : item.matchedMaterial }
          : item
      )
    );
  };

  const handleAIFuzzyMatch = async (id, term) => {
    if (!term || term.length < 2) return null;
    setItems(prev => prev.map(item => item.id === id ? { ...item, loading: true } : item));
    try {
      const res = await axiosInstance.get(`/materials/fuzzy-search?term=${encodeURIComponent(term)}`);
      if (res.data.success && res.data.data?.match) {
        const matched = res.data.data.match;
        setItems(prev => prev.map(item => item.id === id ? { ...item, matchedMaterial: matched, loading: false } : item));
        if (matched.confidence < 100) {
          toast.info(
            <div className="flex items-center">
              <SparklesIcon className="w-5 h-5 text-amber-500 mr-2" />
              <span>AI matched "{term}" to "{matched.name}"</span>
            </div>
          );
        }
        return matched;
      }
      setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false } : item));
      return null;
    } catch {
      setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false } : item));
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    let finalContractorId = selectedContractor;

    // Handle Contractor Validation / Creation
    if (isNewContractor) {
      if (!newContractor.name || !newContractor.email) {
        toast.error('Name and Email are required for a new contractor.');
        setSubmitting(false);
        return;
      }
      try {
        const authRes = await axiosInstance.post('/auth/create-contractor', newContractor);
        if (authRes.data.success) {
          finalContractorId = authRes.data.data._id;
          toast.success(`Contractor "${authRes.data.data.name}" created. Credentials have been sent to their email.`);
          // Refresh contractor list so they appear in dropdown next time
          await fetchContractors();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to create new contractor');
        setSubmitting(false);
        return;
      }
    } else if (!selectedContractor) {
      toast.error('Please select a contractor.');
      setSubmitting(false);
      return;
    }

    // Process Materials
    let processedItems = [...items];
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      if (!item.matchedMaterial && item.materialName) {
        const match = await handleAIFuzzyMatch(item.id, item.materialName);
        if (match) processedItems[i] = { ...processedItems[i], matchedMaterial: match };
      }
    }

    const invalid = processedItems.filter(item => !item.matchedMaterial || !item.requestedQuantity);
    if (invalid.length > 0) {
      toast.error('Please ensure all items have a valid material match and quantity.');
      setSubmitting(false);
      return;
    }

    // Issue Request
    try {
      const res = await axiosInstance.post('/requests/issue', {
        contractor: finalContractorId,
        project: selectedProject || undefined,
        priority,
        notes,
        items: processedItems.map(item => ({
          material: item.matchedMaterial._id,
          requestedQuantity: Number(item.requestedQuantity),
          unit: item.matchedMaterial.unit,
        })),
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setSuccessRecord(res.data.data);
        setItems([{ id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false }]);
        setNotes(''); 
        setPriority('medium'); 
        setSelectedContractor(''); 
        setSelectedProject('');
        setIsNewContractor(false);
        setNewContractor({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue materials');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContractorObj = contractors.find(c => c._id === selectedContractor);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issue Materials</h1>
        <p className="text-sm text-slate-500 mt-1">Directly issue materials to a contractor. Stock will be updated immediately.</p>
      </div>



      {/* Success Banner */}
      {successRecord && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-800">Issue Recorded — {successRecord.requestId}</p>
            <p className="text-sm text-green-700 mt-0.5">
              {successRecord.items?.length} material(s) issued to <strong>{successRecord.contractor?.name}</strong>. Stock updated.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                id="btn-download-issue-report"
                onClick={() => downloadIssueReport(successRecord._id)}
                disabled={isDownloading(`issue-${successRecord._id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-60 transition-colors"
              >
                {isDownloading(`issue-${successRecord._id}`) ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Download Issue Report
                  </>
                )}
              </button>
              <button className="text-xs text-green-600 underline" onClick={() => setSuccessRecord(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-lg font-semibold text-slate-800">Contractor & Project</h2>
            <div className="bg-slate-100 p-1 rounded-lg flex text-sm">
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md font-medium transition-all ${!isNewContractor ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setIsNewContractor(false)}
              >
                Select Existing
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${isNewContractor ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setIsNewContractor(true)}
              >
                <UserPlusIcon className="w-4 h-4" /> Create New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isNewContractor ? (
              // Existing Contractor View
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <UserIcon className="inline w-4 h-4 mr-1 text-slate-500" />
                  Select Contractor <span className="text-red-500">*</span>
                </label>
                <select className="input-field bg-white" value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)} required={!isNewContractor}>
                  <option value="">-- Select Contractor --</option>
                  {contractors.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
                </select>
                {selectedContractorObj?.phone && (
                  <p className="text-xs text-primary-600 mt-1 font-medium">📞 {selectedContractorObj.phone}</p>
                )}
              </div>
            ) : (
              // Create New Contractor View
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2 lg:col-span-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contractor Full Name <span className="text-red-500">*</span></label>
                  <input type="text" className="input-field py-1.5 text-sm" required={isNewContractor} value={newContractor.name} onChange={(e) => setNewContractor({...newContractor, name: e.target.value})} placeholder="e.g. Acme Builders" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" className="input-field py-1.5 text-sm" required={isNewContractor} value={newContractor.email} onChange={(e) => setNewContractor({...newContractor, email: e.target.value})} placeholder="contractor@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" className="input-field py-1.5 text-sm" value={newContractor.phone} onChange={(e) => setNewContractor({...newContractor, phone: e.target.value})} placeholder="(Optional)" />
                </div>
                <p className="text-xs text-slate-500 italic">
                  A secure password will be automatically generated.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project (Optional)</label>
                <select className="input-field bg-white" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">-- No Project --</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select className="input-field bg-white" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Materials to Issue</h2>
              <p className="text-sm text-slate-500">AI will find the exact material from your inventory.</p>
            </div>
            <button type="button" onClick={handleAddItem} className="btn-secondary flex items-center text-sm py-1.5">
              <PlusIcon className="w-4 h-4 mr-1" /> Add Row
            </button>
          </div>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-200 text-slate-600 font-bold shrink-0">{index + 1}</div>
                <div className="flex-1 w-full relative">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input-field pr-10 ${item.matchedMaterial ? 'border-green-500 ring-1 ring-green-500' : ''}`}
                      placeholder="e.g. cement, steel rods, bricks..."
                      value={item.materialName}
                      onChange={(e) => handleItemChange(item.id, 'materialName', e.target.value)}
                      onBlur={(e) => handleAIFuzzyMatch(item.id, e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {item.loading ? (
                        <div className="h-4 w-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                      ) : item.matchedMaterial ? (
                        <SparklesIcon className="h-5 w-5 text-amber-500" />
                      ) : (
                        <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {item.matchedMaterial && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✓ {item.matchedMaterial.name} <span className="text-slate-400">({item.matchedMaterial.unit})</span>
                    </p>
                  )}
                </div>
                <div className="w-full sm:w-32 shrink-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number" min="1"
                    className="input-field"
                    placeholder="Qty"
                    value={item.requestedQuantity}
                    onChange={(e) => handleItemChange(item.id, 'requestedQuantity', e.target.value)}
                    required
                  />
                </div>
                <div className="shrink-0 pt-5">
                  <button type="button" onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-30">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Notes</h2>
          <textarea className="input-field" rows="3" placeholder="Site location, delivery instructions, or any special notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" className="btn-secondary" onClick={() => window.history.back()}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting ? (
              <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Issuing...</>
            ) : (
              <><CheckCircleIcon className="w-5 h-5" />Issue Materials</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueMaterials;

