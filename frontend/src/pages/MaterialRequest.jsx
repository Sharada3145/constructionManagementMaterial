import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';

const MaterialRequest = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState([{ id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false }]);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch user's projects (for contractor, ideally filter on backend)
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get('/projects');
        if (res.data.success) {
          setProjects(res.data.data);
          if (res.data.data.length > 0) setSelectedProject(res.data.data[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    fetchProjects();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false }]);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value, matchedMaterial: field === 'materialName' ? null : item.matchedMaterial } : item));
  };

  const handleAIFuzzyMatch = async (id, term) => {
    if (!term || term.length < 3) return null;
    
    setItems(prev => prev.map(item => item.id === id ? { ...item, loading: true } : item));
    
    try {
      const res = await axiosInstance.get(`/materials/fuzzy-search?term=${encodeURIComponent(term)}`);
      
      if (res.data.success && res.data.data) {
        const aiResult = res.data.data;
        
        if (aiResult.match) {
          setItems(prev => prev.map(item => 
            item.id === id 
              ? { ...item, matchedMaterial: aiResult.match, loading: false } 
              : item
          ));
          
          if (aiResult.match.confidence < 100) {
            toast.info(
              <div className="flex items-center">
                <SparklesIcon className="w-5 h-5 text-amber-500 mr-2" />
                <span>AI matched: "{term}" to "{aiResult.match.name}"</span>
              </div>
            );
          }
          return aiResult.match;
        }
      }
      setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false } : item));
      return null;
    } catch (error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false } : item));
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      toast.error('Please select a project.');
      return;
    }

    setSubmitting(true);

    // Auto-match any items that haven't been matched yet (e.g. user didn't trigger onBlur)
    let processedItems = [...items];
    for (let i = 0; i < processedItems.length; i++) {
      let item = processedItems[i];
      if (!item.matchedMaterial && item.materialName) {
        const match = await handleAIFuzzyMatch(item.id, item.materialName);
        if (match) {
          processedItems[i].matchedMaterial = match;
        }
      }
    }
    
    // Validate again after auto-matching
    const invalidItems = processedItems.filter(item => !item.matchedMaterial || !item.requestedQuantity);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a valid material match and quantity.');
      setSubmitting(false);
      return;
    }

    if (!selectedProject) {
      toast.error('Please select a project.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        project: selectedProject,
        priority,
        notes,
        items: processedItems.map(item => ({
          material: item.matchedMaterial._id,
          requestedQuantity: Number(item.requestedQuantity),
          unit: item.matchedMaterial.unit
        }))
      };

      const res = await axiosInstance.post('/requests', payload);
      if (res.data.success) {
        toast.success('Material request submitted successfully!');
        // Reset form
        setItems([{ id: Date.now(), materialName: '', requestedQuantity: '', matchedMaterial: null, loading: false }]);
        setNotes('');
        setPriority('medium');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Request Materials</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
              <select 
                className="input-field bg-white"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                required
              >
                <option value="">-- Select a Project --</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
              <select 
                className="input-field bg-white"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Materials Needed</h2>
              <p className="text-sm text-slate-500">Type a material name and our AI will find the exact match.</p>
            </div>
            <button 
              type="button" 
              onClick={handleAddItem}
              className="btn-secondary flex items-center text-sm py-1.5"
            >
              <PlusIcon className="w-4 h-4 mr-1" /> Add Row
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-200 text-slate-600 font-bold shrink-0">
                  {index + 1}
                </div>
                
                <div className="flex-1 w-full relative">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material Name (e.g. cemnt)</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`input-field pr-10 ${item.matchedMaterial ? 'border-green-500 ring-1 ring-green-500' : ''}`}
                      placeholder="Type to search..."
                      value={item.materialName}
                      onChange={(e) => handleItemChange(item.id, 'materialName', e.target.value)}
                      onBlur={(e) => handleAIFuzzyMatch(item.id, e.target.value)}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {item.loading ? (
                        <div className="h-4 w-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
                      ) : item.matchedMaterial ? (
                        <SparklesIcon className="h-5 w-5 text-amber-500" title="AI Matched" />
                      ) : (
                        <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {item.matchedMaterial && (
                    <p className="text-xs text-green-600 mt-1 flex items-center font-medium">
                      Matched: {item.matchedMaterial.name}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-32 shrink-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="Qty"
                    value={item.requestedQuantity}
                    onChange={(e) => handleItemChange(item.id, 'requestedQuantity', e.target.value)}
                    required
                  />
                </div>

                <div className="shrink-0 pt-5">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Additional Notes</h2>
          <textarea
            className="input-field"
            rows="3"
            placeholder="Delivery instructions or specific requirements..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialRequest;
