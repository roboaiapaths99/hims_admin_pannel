import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle, Search, 
  Activity, ClipboardList, PenTool, Plus, X, Box, RefreshCw, FileText
} from 'lucide-react';

interface OTBooking {
  id: string;
  patient_name: string;
  patient_mrn: string;
  surgery_name: string;
  surgeon_name: string;
  anesthetist_name: string;
  room_number: string;
  schedule_date: string;
  status: string;
  pre_op_diagnosis?: string;
  post_op_diagnosis?: string;
  anesthesia_details?: string;
  surgery_findings?: string;
  blood_loss?: number;
  post_op_plan?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  code?: string;
}

interface Batch {
  id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
}

interface SelectedConsumable {
  medicine_id: string;
  name: string;
  quantity: number;
  warehouse_id: string;
  batch_id: string;
  batches: Batch[];
  available_stock: number;
}

export const SurgeryNotes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<OTBooking | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'consumables'>('report');
  
  // Tab 1: Findings form state
  const [preOpDiag, setPreOpDiag] = useState('');
  const [postOpDiag, setPostOpDiag] = useState('');
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('');
  const [findingsNotes, setFindingsNotes] = useState('');
  const [bloodLossVol, setBloodLossVol] = useState<string>('');
  const [postOpInstructions, setPostOpInstructions] = useState('');

  // Tab 2: Consumables state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [selectedConsumables, setSelectedConsumables] = useState<SelectedConsumable[]>([]);
  
  // Statuses
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBookingDetails();
    }
  }, [id]);

  const loadBookingDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/ot/bookings/${id}`);
      const b: OTBooking = res.data;
      setBooking(b);
      
      // Populate findings
      setPreOpDiag(b.pre_op_diagnosis || '');
      setPostOpDiag(b.post_op_diagnosis || '');
      setAnesthesiaNotes(b.anesthesia_details || '');
      setFindingsNotes(b.surgery_findings || '');
      setBloodLossVol(b.blood_loss !== undefined && b.blood_loss !== null ? b.blood_loss.toString() : '');
      setPostOpInstructions(b.post_op_plan || '');
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve surgery session details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tab 1: Save findings handler
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      pre_op_diagnosis: preOpDiag.trim() || null,
      post_op_diagnosis: postOpDiag.trim() || null,
      anesthesia_details: anesthesiaNotes.trim() || null,
      surgery_findings: findingsNotes.trim() || null,
      blood_loss: bloodLossVol ? parseFloat(bloodLossVol) : null,
      post_op_plan: postOpInstructions.trim() || null
    };

    try {
      const res = await apiClient.put(`/api/ot/bookings/${id}`, payload);
      setBooking(res.data);
      setSuccess('Surgical report documentation saved successfully.');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save surgical findings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 2: Item search logic
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        searchInventoryItems();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchInventoryItems = async () => {
    setIsSearchingItems(true);
    try {
      const res = await apiClient.get('/api/pharmacy/inventory/search', { params: { q: searchQuery } });
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingItems(false);
    }
  };

  const handleSelectItem = async (item: InventoryItem) => {
    setSearchQuery('');
    setSearchResults([]);
    
    // Fetch active batches for selected medicine
    try {
      const res = await apiClient.get('/api/pharmacy/inventory/batches', { params: { item_id: item.id } });
      const batches: Batch[] = res.data;
      
      const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
      
      // Default to the branch warehouse mapping (fallback handle inside API)
      const defaultWarehouseId = "000000000000000000000001"; 

      setSelectedConsumables(prev => {
        // Prevent duplicate items
        if (prev.some(i => i.medicine_id === item.id)) return prev;
        
        return [
          ...prev,
          {
            medicine_id: item.id,
            name: item.name,
            quantity: 1,
            warehouse_id: defaultWarehouseId,
            batch_id: batches.length > 0 ? batches[0].id : '',
            batches: batches,
            available_stock: totalStock
          }
        ];
      });
    } catch (err) {
      console.error('Failed to retrieve batches for items', err);
      alert('Failed to retrieve stock batches details.');
    }
  };

  const handleRemoveConsumable = (idx: number) => {
    setSelectedConsumables(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConsumableField = (idx: number, field: keyof SelectedConsumable, value: any) => {
    setSelectedConsumables(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: value
      };
      
      // If batch is changing, update available quantity limit check
      if (field === 'batch_id') {
        const matchingBatch = updated[idx].batches.find(b => b.id === value);
        if (matchingBatch) {
          updated[idx].available_stock = matchingBatch.quantity;
        }
      }
      return updated;
    });
  };

  const handleDeductConsumables = async () => {
    if (selectedConsumables.length === 0) {
      setError('Please add at least one stock supply material to deduct.');
      return;
    }

    setIsDeducting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      items: selectedConsumables.map(i => ({
        medicine_id: i.medicine_id,
        quantity: i.quantity,
        warehouse_id: i.warehouse_id,
        batch_id: i.batch_id || null
      }))
    };

    try {
      const res = await apiClient.post(`/api/ot/bookings/${id}/consumables`, payload);
      if (res.data.status === 'completed') {
        setSuccess('All surgical consumables deducted from stock levels cleanly.');
        setSelectedConsumables([]);
        loadBookingDetails();
      } else {
        // Degraded state (some items failed)
        const errorDetails = res.data.failed.map((f: any) => f.error).join(', ');
        setError(`Deduction completed with errors: ${errorDetails}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to complete consumables stock sync.');
    } finally {
      setIsDeducting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 font-sans">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading surgical reports compiler...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/ot/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer border-0 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono font-sans">EMR Surgery Compiler</span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-teal-700">
          <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Booking demographics card header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Patient Details</span>
          <h4 className="text-sm font-bold mt-1">{booking?.patient_name}</h4>
          <p className="font-mono text-slate-400 text-[10px] mt-0.5">MRN: {booking?.patient_mrn}</p>
        </div>
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Procedure</span>
          <h4 className="text-sm font-bold mt-1 line-clamp-1">{booking?.surgery_name}</h4>
          <p className="text-slate-400 text-[10px] mt-0.5">Room: {booking?.room_number}</p>
        </div>
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Anesthetist Team</span>
          <h4 className="text-sm font-bold mt-1">Dr. {booking?.anesthetist_name}</h4>
          <p className="text-slate-400 text-[10px] mt-0.5">
            Status: <span className="text-teal-400 font-bold uppercase tracking-wider font-mono">{booking?.status.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('report')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
            activeTab === 'report' 
              ? 'border-teal-600 text-teal-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Clinical Findings & Anesthesia Report
        </button>
        <button
          onClick={() => setActiveTab('consumables')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
            activeTab === 'consumables' 
              ? 'border-teal-600 text-teal-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Surgical Consumables & stock Sync
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'report' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSaveReport} className="space-y-4 text-xs font-semibold text-slate-600">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
              <FileText className="h-4.5 w-4.5 text-teal-600 mr-2" /> Surgery Findings Documentation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Pre-Operative Diagnosis</label>
                <textarea
                  value={preOpDiag}
                  onChange={(e) => setPreOpDiag(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                  placeholder="Clinical assessment before incision..."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Post-Operative Diagnosis</label>
                <textarea
                  value={postOpDiag}
                  onChange={(e) => setPostOpDiag(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                  placeholder="Clinical assessment after surgery complete..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Anesthesia Technique & Administration Notes</label>
              <textarea
                value={anesthesiaNotes}
                onChange={(e) => setAnesthesiaNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                placeholder="Details of anesthesia induction, maintenance, dosage logs, agent types..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Intra-Operative Surgical Findings</label>
              <textarea
                value={findingsNotes}
                onChange={(e) => setFindingsNotes(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                placeholder="Step-by-step description of procedures, clinical observations, findings, and technique..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Est. Blood Loss (ml)</label>
                <input
                  type="number"
                  step="any"
                  value={bloodLossVol}
                  onChange={(e) => setBloodLossVol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 font-mono"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Post-Operative Recovery Instructions</label>
                <input
                  type="text"
                  value={postOpInstructions}
                  onChange={(e) => setPostOpInstructions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
                  placeholder="Special monitoring instructions for recovery ward team..."
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                    Saving Report logs...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Surgical Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Box className="h-4.5 w-4.5 text-teal-600 mr-2" /> Deduct Surgery Supplies & Consumables
            </h3>
            
            {/* Search inventory items dropdown */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search surgical kits, sutures, syringes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 text-xs font-semibold"
              />

              {isSearchingItems && (
                <div className="absolute right-3 top-2">
                  <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20 text-xs">
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left px-4 py-2 border-b border-slate-100 hover:bg-slate-50 flex justify-between font-semibold cursor-pointer bg-white"
                    >
                      <span>{item.name}</span>
                      {item.code && <span className="text-slate-400 font-mono">{item.code}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedConsumables.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-semibold italic">
              Search and add surgical items/medicines above to compile the consumables deduction sheet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[9px] uppercase font-bold">
                      <th className="pb-2 w-[40%]">Item Name</th>
                      <th className="pb-2 w-[25%]">Batch No (FEFO)</th>
                      <th className="pb-2 w-[15%]">Stock Avail</th>
                      <th className="pb-2 w-[15%]">Qty Used</th>
                      <th className="pb-2 w-[5%] text-right font-sans">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConsumables.map((item, idx) => (
                      <tr key={item.medicine_id} className="border-b border-slate-100 font-sans">
                        <td className="py-2.5 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 pr-4">
                          <select
                            value={item.batch_id}
                            onChange={(e) => handleConsumableField(idx, 'batch_id', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          >
                            {item.batches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.batch_number} (Exp: {new Date(b.expiry_date).toLocaleDateString()})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 font-mono text-slate-500">{item.available_stock}</td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            min="1"
                            max={item.available_stock}
                            value={item.quantity}
                            onChange={(e) => handleConsumableField(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveConsumable(idx)}
                            className="text-slate-400 hover:text-red-500 cursor-pointer border-0 bg-transparent"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <button
                  onClick={handleDeductConsumables}
                  disabled={isDeducting}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0"
                >
                  {isDeducting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                      Syncing Deductions...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Confirm Stock Deductions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default SurgeryNotes;
