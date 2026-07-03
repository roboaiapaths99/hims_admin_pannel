import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, Pill, FileText, CheckCircle, XCircle, 
  Loader2, AlertCircle, RefreshCw, Layers 
} from 'lucide-react';

interface PrescriptionItem {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity_prescribed: number;
}

interface Prescription {
  id: string;
  patient_id: string;
  visit_id: string;
  items: PrescriptionItem[];
  status: string;
  doctor_name: string;
  patient_name: string;
}

interface Batch {
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  mrp: number;
  available_quantity: number;
}

export const PharmacyDispense: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // prescription_id
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [batchesMap, setBatchesMap] = useState<Record<string, Batch[]>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // medicine_id -> batch_id

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPrescriptionAndBatches();
    }
  }, [id]);

  const fetchPrescriptionAndBatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch prescription details
      const prescRes = await apiClient.get(`/api/pharmacy/prescriptions/${id}`);
      const prescData: Prescription = prescRes.data;
      setPrescription(prescData);

      // 2. Fetch available batches for each medicine
      const tempBatchesMap: Record<string, Batch[]> = {};
      const tempSelectedBatches: Record<string, string> = {};

      for (const item of prescData.items) {
        const batchRes = await apiClient.get('/api/pharmacy/inventory/batches', {
          params: { item_id: item.medicine_id }
        });
        tempBatchesMap[item.medicine_id] = batchRes.data;
        
        // Auto-select first batch as default (since they are sorted by FEFO!)
        if (batchRes.data.length > 0) {
          tempSelectedBatches[item.medicine_id] = batchRes.data[0].batch_id;
        }
      }

      setBatchesMap(tempBatchesMap);
      setSelectedBatches(tempSelectedBatches);

    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve prescription or stock batches details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchChange = (medicineId: string, batchId: string) => {
    setSelectedBatches(prev => ({ ...prev, [medicineId]: batchId }));
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescription || !id) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Build dispense items payload
    const dispenseItems = prescription.items.map(item => {
      const selectedBatchId = selectedBatches[item.medicine_id];
      return {
        medicine_id: item.medicine_id,
        quantity: item.quantity_prescribed,
        batch_id: selectedBatchId || null
      };
    });

    // Check if any medication is missing a batch allocation
    const missingBatchItem = dispenseItems.find(i => !i.batch_id);
    if (missingBatchItem) {
      const itemDetails = prescription.items.find(i => i.medicine_id === missingBatchItem.medicine_id);
      setError(`No stock batch selected/available for: ${itemDetails?.medicine_name || 'Item'}`);
      setIsSubmitting(false);
      return;
    }

    // Validate selected batch has sufficient quantity
    for (const item of prescription.items) {
      const selectedBatchId = selectedBatches[item.medicine_id];
      const itemBatches = batchesMap[item.medicine_id] || [];
      const selectedBatchInfo = itemBatches.find(b => b.batch_id === selectedBatchId);
      if (selectedBatchInfo && selectedBatchInfo.available_quantity < item.quantity_prescribed) {
        setError(`Insufficient stock for ${item.medicine_name}. Selected batch has only ${selectedBatchInfo.available_quantity} available, but ${item.quantity_prescribed} is required.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await apiClient.post(`/api/pharmacy/prescriptions/${id}/dispense`, {
        items: dispenseItems
      });

      setSuccess('Prescription medicines dispensed and inventory levels deducted successfully.');
      setTimeout(() => {
        navigate('/pharmacy/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to dispense prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPrescription = async () => {
    if (!id || !window.confirm('Are you sure you want to void this prescription and release all reserved stock?')) {
      return;
    }
    
    setIsCancelling(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(`/api/pharmacy/prescriptions/${id}/cancel`);
      setSuccess('Prescription cancelled and reserved stock returned to catalog.');
      setTimeout(() => {
        navigate('/pharmacy/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to cancel prescription.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto mt-12 text-xs">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">Prescription Profile Not Found</h2>
        <button
          onClick={() => navigate('/pharmacy/dashboard')}
          className="inline-flex items-center text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/pharmacy/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Queue
        </button>
        <span className="text-xs font-bold text-slate-400 font-mono">Prescription: #{prescription.id.substring(18)}</span>
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

      <form onSubmit={handleDispense} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Demographics Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">E-Prescription Details</span>
              <h2 className="text-md font-bold truncate mt-1">{prescription.patient_name}</h2>
              <div className="flex justify-between text-[11px] text-slate-300 mt-2 font-mono">
                <span>Doctor: {prescription.doctor_name}</span>
                <span>Status: {prescription.status}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Quick Operations</span>
            <button
              type="button"
              onClick={handleCancelPrescription}
              disabled={isCancelling || isSubmitting}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
            >
              <XCircle className="h-4.5 w-4.5 mr-1.5" /> Void Prescription
            </button>
          </div>
        </div>

        {/* Right Dispense Selection Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center border-b border-slate-100 pb-3">
              <Pill className="h-4.5 w-4.5 text-teal-600 mr-2" /> Select Stock Batches
            </h3>

            {/* List medication lines */}
            <div className="space-y-5">
              {prescription.items.map(item => {
                const itemBatches = batchesMap[item.medicine_id] || [];
                const selectedBatchId = selectedBatches[item.medicine_id] || '';
                const selectedBatchInfo = itemBatches.find(b => b.batch_id === selectedBatchId);
                const isOutOfStock = itemBatches.length === 0;
                const hasSufficientStock = selectedBatchInfo && selectedBatchInfo.available_quantity >= item.quantity_prescribed;
                const hasPartialStock = selectedBatchInfo && selectedBatchInfo.available_quantity > 0 && selectedBatchInfo.available_quantity < item.quantity_prescribed;
                
                return (
                  <div key={item.medicine_id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3 font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{item.medicine_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block font-bold">
                          Prescribed: {item.dosage} / {item.frequency} ({item.duration}) - Instructions: {item.instructions || 'None'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className="bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono">
                          Qty Needed: {item.quantity_prescribed}
                        </span>
                        {isOutOfStock ? (
                          <span className="bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                            Out of Stock
                          </span>
                        ) : hasPartialStock ? (
                          <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                            Insufficient ({selectedBatchInfo?.available_quantity} left)
                          </span>
                        ) : hasSufficientStock ? (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                            In Stock
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Batch Selection drop-down */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                          <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" /> Choose active batch (FEFO)
                        </label>
                        {itemBatches.length === 0 ? (
                          <span className="text-[11px] font-bold text-red-600 block mt-2">
                            OUT OF STOCK (No unexpired batches)
                          </span>
                        ) : (
                          <select
                            value={selectedBatchId}
                            onChange={(e) => handleBatchChange(item.medicine_id, e.target.value)}
                            className="mt-1 w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold"
                          >
                            {itemBatches.map(b => (
                              <option key={b.batch_id} value={b.batch_id}>
                                Batch: {b.batch_number} (Exp: {new Date(b.expiry_date).toLocaleDateString()} - Avail: {b.available_quantity})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Display pricing detail */}
                      {selectedBatchInfo && (
                        <div className="flex items-end justify-start md:justify-end text-[10px] text-slate-500 font-semibold pb-1">
                          <div className="text-right">
                            <span className="block font-mono">MRP: ₹{selectedBatchInfo.mrp}</span>
                            <span className="block text-[9px] text-slate-400">Batch Stock available: {selectedBatchInfo.available_quantity} units</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dispense verification action */}
            <div className="border-t border-slate-100 pt-5 flex justify-end space-x-3">
              <button
                type="submit"
                disabled={isSubmitting || isCancelling}
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                )}
                Confirm Dispense & Deduct
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
};
export default PharmacyDispense;
