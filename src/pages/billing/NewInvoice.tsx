import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, CreditCard, Search, Plus, X, Save, 
  Loader2, AlertCircle, CheckCircle, Info, Calculator 
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Visit {
  id: string;
  patient_id: string;
  visit_date: string;
}

interface InvoiceItemDraft {
  description: string;
  quantity: number;
  base_price: number;
  gst_rate: number;
  discount_percentage: number;
}

export const NewInvoice: React.FC = () => {
  const navigate = useNavigate();

  // Search patients
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Draft compilation
  const [visitList, setVisitList] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [discountApprovalCode, setDiscountApprovalCode] = useState('');

  // Invoice Items Builder
  const [items, setItems] = useState<InvoiceItemDraft[]>([]);
  const [flatDiscount, setFlatDiscount] = useState<number>(0);

  // Statuses
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isCompilingDraft, setIsCompilingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search patients on typing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (patientSearch.trim().length > 1) {
        performPatientSearch();
      } else {
        setPatientSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientSearch]);

  const performPatientSearch = async () => {
    setIsSearchingPatients(true);
    try {
      const res = await apiClient.get('/api/patients', { params: { q: patientSearch } });
      setPatientSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // When patient is selected, fetch completed visits history
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatientSuggestions([]);
    setItems([]);
    setFlatDiscount(0);
    setError(null);
    
    setIsCompilingDraft(true);
    try {
      const res = await apiClient.get(`/api/consultation/patient/${patient.id}/history`);
      setVisitList(res.data);
      if (res.data.length > 0) {
        // Auto-select most recent completed visit
        const recentVisit = res.data[0];
        setSelectedVisitId(recentVisit.id);
        // Compile draft charges
        await loadDraftCharges(recentVisit.id);
      } else {
        setSelectedVisitId('');
        await loadDraftCharges('');
      }
    } catch (err) {
      console.error(err);
      setSelectedVisitId('');
      await loadDraftCharges('');
    } finally {
      setIsCompilingDraft(false);
    }
  };

  const loadDraftCharges = async (visitId: string) => {
    setIsCompilingDraft(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/billing/invoices/compile-draft', { 
        visit_id: visitId || undefined, 
        patient_id: selectedPatient?.id 
      });
      setItems(res.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to compile draft items.');
      handleAddCustomItem();
    } finally {
      setIsCompilingDraft(false);
    }
  };

  const handleVisitChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVisitId(val);
    await loadDraftCharges(val);
  };

  // Invoice Items Builder logic
  const handleAddCustomItem = () => {
    setItems(prev => [
      ...prev,
      {
        description: 'New Charge Item',
        quantity: 1,
        base_price: 0,
        gst_rate: 0,
        discount_percentage: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: keyof InvoiceItemDraft, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  // Math Calculations (reproduced from backend logic)
  const calculateTotals = () => {
    let subtotal = 0;
    let gstTotal = 0;
    let taxableTotal = 0;

    items.forEach(item => {
      const discountVal = item.base_price * (item.discount_percentage / 100);
      const netPrice = item.base_price - discountVal;
      const taxableLine = netPrice * item.quantity;
      const gstTax = taxableLine * (item.gst_rate / 100);

      subtotal += item.base_price * item.quantity;
      gstTotal += gstTax;
      taxableTotal += taxableLine;
    });

    const grandTotal = Math.max(0, taxableTotal + gstTotal - flatDiscount);

    return {
      subtotal: round(subtotal),
      gstTotal: round(gstTotal),
      grandTotal: round(grandTotal)
    };
  };

  const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const { subtotal, gstTotal, grandTotal } = calculateTotals();
  const isExcessiveDiscount = subtotal > 0 && ((flatDiscount / subtotal) > 0.10 || items.some(i => i.discount_percentage > 10));

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (items.length === 0) {
      setError('Please add at least one charge item to generate invoice.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      patient_id: selectedPatient.id,
      visit_id: selectedVisitId || null,
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        base_price: i.base_price,
        gst_rate: i.gst_rate,
        discount_percentage: i.discount_percentage
      })),
      discount_amount: flatDiscount,
      discount_approval_code: discountApprovalCode || null
    };

    try {
      const res = await apiClient.post('/api/billing/invoices', payload);
      setSuccess('Invoice created successfully.');
      setTimeout(() => {
        navigate(`/billing/invoice/view/${res.data.id}`);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate billing invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/billing/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Invoice compiler</span>
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

      {/* Main compiler panel splits selection list and details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Select Patient and Visit */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">1. Patient selection</span>
            
            {selectedPatient ? (
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3 text-xs relative">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer font-bold text-sm"
                >
                  &times;
                </button>
                <div>
                  <span className="text-[9px] font-bold text-teal-400 font-mono uppercase block">Active Account</span>
                  <h4 className="font-bold text-sm mt-1">{selectedPatient.first_name} {selectedPatient.last_name}</h4>
                  <p className="font-mono text-slate-400 text-[10px] mt-0.5">MRN: {selectedPatient.mrn}</p>
                  <p className="text-slate-400 text-[10px]">Phone: {selectedPatient.phone}</p>
                </div>
              </div>
            ) : (
              <div className="relative font-sans">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by MRN, Name, Phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />

                {isSearchingPatients && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                  </div>
                )}

                {patientSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20 text-xs">
                    {patientSuggestions.map(pat => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => handleSelectPatient(pat)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold cursor-pointer"
                      >
                        <span>{pat.first_name} {pat.last_name}</span>
                        <span className="text-slate-400 font-mono font-bold">{pat.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Visit selector mapping */}
            {selectedPatient && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">2. Completed clinical visits</label>
                {visitList.length === 0 ? (
                  <p className="text-xs text-amber-600 font-semibold italic">No recorded visits history found. Charging manually.</p>
                ) : (
                  <select
                    value={selectedVisitId}
                    onChange={handleVisitChange}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold"
                  >
                    {visitList.map(v => (
                      <option key={v.id} value={v.id}>
                        OPD Visit - {new Date(v.visit_date).toLocaleDateString()}
                      </option>
                    ))}
                    <option value="">Manual Entry (No Visit)</option>
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-xs text-blue-800 space-y-2">
            <h4 className="font-bold flex items-center">
              <Info className="h-4 w-4 mr-1.5 text-blue-600 flex-shrink-0" /> Tax rules
            </h4>
            <p className="leading-relaxed">
              Standard clinical consultation and laboratory diagnostic tests are usually GST-exempt (0.0%). Custom items or OT room supplies can be taxed as applicable.
            </p>
          </div>
        </div>

        {/* Right Side: Dynamic Charges Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Calculator className="h-4.5 w-4.5 text-teal-600 mr-2" /> Charges Workspace
              </h3>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!selectedPatient}
                className="inline-flex items-center px-2.5 py-1 border border-teal-600 hover:bg-teal-50 text-teal-700 rounded text-[10px] font-bold cursor-pointer disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add custom charge
              </button>
            </div>

            {isCompilingDraft ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold italic">
                {!selectedPatient 
                  ? 'Please select a patient first to start compiling draft charges.' 
                  : 'No charges added. Click "Add custom charge" to record items.'}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse min-w-[600px]">
                    <thead>
                      <tr className="text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
                        <th className="pb-2 w-[40%]">Description</th>
                        <th className="pb-2 w-[10%]">Rate (₹)</th>
                        <th className="pb-2 w-[10%]">Qty</th>
                        <th className="pb-2 w-[10%]">GST (%)</th>
                        <th className="pb-2 w-[10%]">Disc (%)</th>
                        <th className="pb-2 w-[15%]">Total (₹)</th>
                        <th className="pb-2 w-[5%] text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        // calculate draft total
                        const discountVal = item.base_price * (item.discount_percentage / 100);
                        const netPrice = item.base_price - discountVal;
                        const taxableLine = netPrice * item.quantity;
                        const gstTax = taxableLine * (item.gst_rate / 100);
                        const lineTotal = taxableLine + gstTax;

                        return (
                          <tr key={idx} className="border-b border-slate-100 font-sans">
                            <td className="py-2.5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.base_price || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'base_price', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <select
                                value={item.gst_rate}
                                onChange={(e) => handleItemFieldChange(idx, 'gst_rate', parseFloat(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percentage || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'discount_percentage', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 font-mono font-bold text-slate-800">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Final calculations bar */}
                <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row md:justify-between items-end md:items-start gap-4">
                  {/* Custom Flat discount field */}
                  <div className="w-full md:w-48 text-xs">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Flat Invoice discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={flatDiscount || ''}
                      onChange={(e) => setFlatDiscount(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                    />

                    {isExcessiveDiscount && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <label className="block text-[9px] font-bold text-amber-800 uppercase tracking-wide">Manager Approval Override</label>
                        <input
                          type="password"
                          placeholder="Override Code"
                          value={discountApprovalCode}
                          onChange={(e) => setDiscountApprovalCode(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Summary invoice card layout */}
                  <div className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal (gross):</span>
                      <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tax aggregate (GST):</span>
                      <span className="font-mono">₹{gstTotal.toFixed(2)}</span>
                    </div>
                    {flatDiscount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Invoice Discount:</span>
                        <span className="font-mono">-₹{flatDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                      <span>Grand Total:</span>
                      <span className="font-mono text-teal-700">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Generate invoice button trigger */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSaveInvoice}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    Generate & Print Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default NewInvoice;
