import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Building, User, Bed, Calendar, DollarSign, Plus, Loader2, 
  AlertCircle, CheckCircle, RefreshCw, FileText, ArrowRight, Save, UtensilsCrossed
} from 'lucide-react';

interface ProgressNote {
  date: string;
  note: string;
  by: string;
}

interface Admission {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  doctor_id: string;
  doctor_name: string;
  room_id: string;
  room_number: string;
  room_type: string;
  admission_date: string;
  initial_deposit: number;
  status: 'admitted' | 'discharged';
  progress_notes?: ProgressNote[];
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  hourly_rate: number;
  status: string;
}

interface Charge {
  id: string;
  charge_type: string;
  description: string;
  amount: number;
  gst_rate: number;
  date: string;
}

interface DietOrder {
  id: string;
  admission_id: string;
  meal_type: string;
  diet_type: string;
  special_instructions: string | null;
  delivery_time: string | null;
  status: string;
  created_at: string;
}

export const IPDWorkspace: React.FC = () => {
  const { admissionId } = useParams<{ admissionId: string }>();
  const navigate = useNavigate();
  
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'transfer' | 'ledger' | 'diet'>('notes');

  // Tab 1: Progress Notes state
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Tab 2: Bed Transfer state
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Tab 3: Ledger state
  const [chargeType, setChargeType] = useState('procedure');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeGst, setChargeGst] = useState('0');
  const [isSubmittingCharge, setIsSubmittingCharge] = useState(false);

  // Tab 4: Dietary tracking state
  const [dietHistory, setDietHistory] = useState<DietOrder[]>([]);
  const [isSubmittingDiet, setIsSubmittingDiet] = useState(false);
  const [dietMealType, setDietMealType] = useState('breakfast');
  const [dietDietType, setDietDietType] = useState('regular');
  const [dietDeliveryTime, setDietDeliveryTime] = useState('');
  const [dietInstructions, setDietInstructions] = useState('');

  useEffect(() => {
    fetchAdmissionData();
  }, [admissionId]);

  const fetchAdmissionData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Admission details
      const admRes = await apiClient.get(`/api/ipd/admissions/${admissionId}`);
      setAdmission(admRes.data);

      // 2. Fetch posted charges
      const chargesRes = await apiClient.get(`/api/ipd/admissions/${admissionId}/charges`);
      setCharges(chargesRes.data);

      // 3. Fetch available rooms for transfers
      const roomsRes = await apiClient.get('/api/config/rooms');
      const filteredRooms = roomsRes.data.filter((r: any) => 
        r.room_type !== 'OT' && r.status === 'available' && r.id !== admRes.data.room_id
      );
      setAvailableRooms(filteredRooms);
      if (filteredRooms.length > 0) {
        setSelectedRoomId(filteredRooms[0].id);
      }

      // 4. Fetch diet history and filter for this admission
      const dietRes = await apiClient.get('/api/ipd/diet-orders');
      const filteredDiets = dietRes.data.filter((d: any) => d.admission_id === admissionId);
      setDietHistory(filteredDiets);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to retrieve IPD workspace context.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    setSuccess(null);
    try {
      await apiClient.post(`/api/ipd/admissions/${admissionId}/notes`, { note: newNote });
      setNewNote('');
      setSuccess('Rounding progress note saved.');
      fetchAdmissionData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add progress note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    setIsSubmittingTransfer(true);
    setSuccess(null);
    try {
      await apiClient.post(`/api/ipd/admissions/${admissionId}/transfer`, {
        room_id: selectedRoomId,
        reason: transferReason || 'Relocation of care'
      });
      setTransferReason('');
      setSuccess('Patient relocated and room inventory updated successfully.');
      fetchAdmissionData();
    } catch (err: any) {
      setError(err.response?.data?.detail || ' relcoation transfer request failed.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeDesc || !chargeAmount) return;
    setIsSubmittingCharge(true);
    setSuccess(null);
    try {
      await apiClient.post(`/api/ipd/admissions/${admissionId}/charges`, {
        charge_type: chargeType,
        description: chargeDesc,
        amount: parseFloat(chargeAmount),
        gst_rate: parseFloat(chargeGst)
      });
      setChargeDesc('');
      setChargeAmount('');
      setSuccess('Charge posted successfully.');
      fetchAdmissionData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ledger entry posting failed.');
    } finally {
      setIsSubmittingCharge(false);
    }
  };

  const handlePostDietOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDiet(true);
    setSuccess(null);
    try {
      await apiClient.post('/api/ipd/diet-orders', {
        admission_id: admissionId,
        meal_type: dietMealType,
        diet_type: dietDietType,
        special_instructions: dietInstructions || null,
        delivery_time: dietDeliveryTime || null
      });
      setDietInstructions('');
      setDietDeliveryTime('');
      setSuccess('Dietary order prescription created successfully.');
      fetchAdmissionData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit dietary order');
    } finally {
      setIsSubmittingDiet(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-sm text-red-750">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p>No details found for IPD Admission ID: {admissionId}</p>
      </div>
    );
  }

  const elapsedDays = Math.max(
    1, 
    Math.ceil((new Date().getTime() - new Date(admission.admission_date).getTime()) / (1000 * 60 * 60 * 24))
  );
  
  const estimatedBedCharge = (availableRooms.find(r => r.id === admission.room_id)?.hourly_rate || 1500) * elapsedDays;

  return (
    <div className="space-y-6 font-sans">
      {/* Banner Summary */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-teal-400" />
            <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest bg-teal-950 border border-teal-900 px-2.5 py-0.5 rounded-full">IPD Ward cockpit</span>
          </div>
          <h2 className="text-xl font-black text-slate-100">{admission.patient_name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1"><User className="h-4.5 w-4.5" /> MRN: {admission.patient_mrn}</span>
            <span className="flex items-center gap-1"><Bed className="h-4.5 w-4.5" /> Room: {admission.room_number} ({admission.room_type})</span>
            <span className="flex items-center gap-1 font-mono text-[10px]"><Calendar className="h-4.5 w-4.5" /> Admitted on: {new Date(admission.admission_date).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center min-w-[110px]">
            <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Deposited</span>
            <span className="text-sm font-bold text-slate-200">₹{admission.initial_deposit.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center min-w-[110px]">
            <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Elapsed time</span>
            <span className="text-sm font-bold text-slate-200">{elapsedDays} Day(s)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs font-semibold text-red-750 flex items-start gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-xs font-semibold text-emerald-700 flex items-start gap-2 animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Workspace Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Summary Card details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 self-start text-xs font-semibold text-slate-600">
          <h3 className="text-sm font-bold text-slate-800">IPD Admission Details</h3>
          
          <div className="space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-450 block uppercase">Primary Attending doctor</span>
              <p className="text-slate-800 font-bold mt-0.5">{admission.doctor_name || 'Dr. Medical Officer'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-450 block uppercase">Admitting Room details</span>
              <p className="text-slate-800 font-bold mt-0.5">Room No: {admission.room_number} — {admission.room_type}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-450 block uppercase">Admission ID Reference</span>
              <p className="text-slate-800 font-mono text-[10.5px] mt-0.5">{admission.id}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-455 block uppercase">Admitting Status</span>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1 border ${
                admission.status === 'admitted' 
                  ? 'bg-teal-50 text-teal-700 border-teal-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {admission.status}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Tabs Workspace */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabs Headers */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-teal-600 text-teal-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <FileText className="h-4.5 w-4.5 inline mr-1.5" /> Progress Notes
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'transfer'
                    ? 'border-teal-600 text-teal-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <RefreshCw className="h-4.5 w-4.5 inline mr-1.5" /> Bed Transfer
              </button>
              <button
                onClick={() => setActiveTab('diet')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'diet'
                    ? 'border-teal-600 text-teal-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <UtensilsCrossed className="h-4.5 w-4.5 inline mr-1.5" /> Dietary Track
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'border-teal-600 text-teal-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <DollarSign className="h-4.5 w-4.5 inline mr-1.5" /> Billing Ledger
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              
              {/* Progress Notes tab */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Log rounding clinical note</label>
                    <textarea
                      required
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Input clinical rounding comments, patient recovery state, or nursing notes..."
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingNote}
                        className="inline-flex justify-center items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow disabled:opacity-50"
                      >
                        {isSubmittingNote ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save Progress Note
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-5 space-y-4 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Rounding Logs</h4>
                    {(!admission.progress_notes || admission.progress_notes.length === 0) ? (
                      <p className="text-xs font-medium text-slate-400 text-center py-6">No progress logs recorded yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {admission.progress_notes.map((n, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                              <span>By: {n.by}</span>
                              <span>{new Date(n.date).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-semibold">{n.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bed Transfer tab */}
              {activeTab === 'transfer' && (
                <form onSubmit={handleTransfer} className="space-y-4 max-w-md text-xs font-semibold text-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Current Room / Bed</label>
                    <input
                      type="text"
                      disabled
                      value={`Room ${admission.room_number} (${admission.room_type})`}
                      className="mt-1.5 block w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Available Destination Room</label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {availableRooms.length === 0 ? (
                        <option value="">No available beds found</option>
                      ) : (
                        availableRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.room_number} - {r.room_type} (₹{r.hourly_rate.toFixed(2)}/day)
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Reason for bed relocation</label>
                    <input
                      type="text"
                      required
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="e.g. Admitted to ICU post critical shift"
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTransfer || availableRooms.length === 0}
                    className="inline-flex justify-center items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow disabled:opacity-50"
                  >
                    {isSubmittingTransfer ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    Complete Bed Transfer
                  </button>
                </form>
              )}

              {/* Dietary Prescription tab */}
              {activeTab === 'diet' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Dietary Requirement / Prescription</h4>
                  <form onSubmit={handlePostDietOrder} className="space-y-4 max-w-lg text-xs font-semibold text-slate-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Meal Type</label>
                        <select
                          value={dietMealType}
                          onChange={(e) => setDietMealType(e.target.value)}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Diet Type</label>
                        <select
                          value={dietDietType}
                          onChange={(e) => setDietDietType(e.target.value)}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="regular">Regular</option>
                          <option value="diabetic">Diabetic</option>
                          <option value="liquid">Liquid Only</option>
                          <option value="low_sodium">Low Sodium</option>
                          <option value="soft">Soft Diet</option>
                          <option value="npo">NPO (Nil by Mouth)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Preferred Delivery Time</label>
                        <input
                          type="text"
                          placeholder="e.g. 08:30 AM"
                          value={dietDeliveryTime}
                          onChange={(e) => setDietDeliveryTime(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Special Instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. low sugar, warm water"
                          value={dietInstructions}
                          onChange={(e) => setDietInstructions(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingDiet}
                      className="inline-flex justify-center items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow disabled:opacity-50"
                    >
                      {isSubmittingDiet ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                      Add Dietary Requirement
                    </button>
                  </form>

                  {/* Dietary logs history */}
                  <div className="border-t border-slate-100 pt-5 space-y-4 text-xs font-semibold">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dietary Order Logs</h4>
                    {dietHistory.length === 0 ? (
                      <p className="text-xs font-medium text-slate-400 text-center py-6">No meal logs recorded for this stay.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs text-slate-700 border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold uppercase text-[9px] tracking-wider">
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Meal</th>
                              <th className="px-4 py-2.5">Diet Type</th>
                              <th className="px-4 py-2.5">Instructions</th>
                              <th className="px-4 py-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dietHistory.map((d, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{new Date(d.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 capitalize font-bold text-slate-800">{d.meal_type}</td>
                                <td className="px-4 py-3 capitalize text-slate-650">{d.diet_type.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-slate-550 italic text-[11px]">{d.special_instructions || '—'}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                    d.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    d.status === 'prepared' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    d.status === 'preparing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {d.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Billing Ledger tab */}
              {activeTab === 'ledger' && (
                <div className="space-y-6">
                  {/* Realtime compilation charges grid */}
                  <div className="space-y-3.5 text-xs font-semibold">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Real-time ledger overview</h4>
                      
                      <button
                        onClick={() => navigate(`/billing/invoice/new?patient_id=${admission.patient_id}`)}
                        className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow"
                      >
                        Compile GST Invoice <ArrowRight className="h-3 w-3 ml-1" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-bold text-slate-600 uppercase">Item Description</th>
                            <th className="px-4 py-2.5 text-left font-bold text-slate-600 uppercase">Type</th>
                            <th className="px-4 py-2.5 text-right font-bold text-slate-600 uppercase">Rate</th>
                            <th className="px-4 py-2.5 text-right font-bold text-slate-600 uppercase">Tax Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* Live estimated Bed day rent */}
                          <tr>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              IPD Bed Rent: Room {admission.room_number} ({admission.room_type}) - {elapsedDays} days
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-500">Bed Charge</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">₹ {estimatedBedCharge.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-500">0%</td>
                          </tr>
                          
                          {/* Custom ledger logs */}
                          {charges.map((c) => (
                            <tr key={c.id}>
                              <td className="px-4 py-3 font-semibold text-slate-800">{c.description}</td>
                              <td className="px-4 py-3 font-medium text-slate-500 capitalize">{c.charge_type.replace('_', ' ')}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">₹ {c.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-500">{c.gst_rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add charge tool */}
                  <form onSubmit={handleAddCharge} className="border-t border-slate-100 pt-5 space-y-4 text-xs font-semibold text-slate-700">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Post new charge item</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Charge Type</label>
                        <select
                          value={chargeType}
                          onChange={(e) => setChargeType(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="procedure">Procedure Fee</option>
                          <option value="doctor_visit">Doctor Round Fee</option>
                          <option value="nursing_fee">Specialist Nurse Fee</option>
                          <option value="other">Consumables / Other</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Item Description</label>
                        <input
                          type="text"
                          required
                          value={chargeDesc}
                          onChange={(e) => setChargeDesc(e.target.value)}
                          placeholder="e.g. ICU ventilator setup charge"
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Base Price (INR)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingCharge}
                      className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow disabled:opacity-50"
                    >
                      {isSubmittingCharge ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      Add Charge to Ledger
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPDWorkspace;
