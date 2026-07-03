import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  AlertTriangle, Plus, X, Phone, MapPin, User, Clock, 
  Activity, Truck, ArrowRight, UserCheck, Check, Key, HelpCircle, Loader2
} from 'lucide-react';

interface EmergencyAdmission {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  patient_phone: string | null;
  triage_score: number;
  triage_category: string;
  chief_complaint: string | null;
  attending_doctor_id: string | null;
  attending_doctor_name: string | null;
  assigned_bed_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ERStats {
  total_active: number;
  by_triage: { red: number; orange: number; yellow: number; green: number; blue: number };
  by_status: { admitted: number; ipd_transferred: number; discharged: number };
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  occupancy_status: string;
}

const EmergencyDashboard: React.FC = () => {
  const [admissions, setAdmissions] = useState<EmergencyAdmission[]>([]);
  const [stats, setStats] = useState<ERStats | null>(null);
  const [doctors, setDoctors] = useState<StaffUser[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('admitted');
  const [selectedAdmission, setSelectedAdmission] = useState<EmergencyAdmission | null>(null);

  // Quick admit form
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formPhone, setFormPhone] = useState('');
  const [formComplaint, setFormComplaint] = useState('');
  const [formTriageScore, setFormTriageScore] = useState(3);
  const [formTriageCategory, setFormTriageCategory] = useState('yellow');
  const [formDoctorId, setFormDoctorId] = useState('');
  const [formBedNumber, setFormBedNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Assign Doctor/Bed form
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assignBedNumber, setAssignBedNumber] = useState('');

  // Transfer IPD Form
  const [transferRoomId, setTransferRoomId] = useState('');
  const [transferDoctorId, setTransferDoctorId] = useState('');
  const [transferDeposit, setTransferDeposit] = useState('0');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status_filter = filterStatus;
      const [admRes, statsRes, doctorsRes, roomsRes] = await Promise.all([
        apiClient.get('/api/emergency/admissions', { params }),
        apiClient.get('/api/emergency/admissions/stats/summary'),
        apiClient.get('/api/org/users'),
        apiClient.get('/api/config/rooms')
      ]);
      setAdmissions(admRes.data);
      setStats(statsRes.data);
      
      // Filter for doctors/surgeons
      const docsList = doctorsRes.data.filter((u: StaffUser) => 
        ['doctor', 'surgeon', 'anesthetist'].includes(u.role.toLowerCase())
      );
      setDoctors(docsList);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error('Failed to load emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/api/emergency/admissions', {
        patient_name: formName || null,
        patient_age: formAge ? parseInt(formAge) : null,
        patient_gender: formGender,
        patient_phone: formPhone || null,
        chief_complaint: formComplaint || null,
        triage_score: formTriageScore,
        triage_category: formTriageCategory,
        attending_doctor_id: formDoctorId || null,
        assigned_bed_number: formBedNumber || null,
        notes: formNotes || null
      });
      setShowAdmitModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create emergency admission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/api/emergency/admissions/${selectedAdmission.id}`, {
        attending_doctor_id: assignDoctorId || null,
        assigned_bed_number: assignBedNumber || null
      });
      setShowAssignModal(false);
      setAssignDoctorId('');
      setAssignBedNumber('');
      setSelectedAdmission(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    if (!transferRoomId || !transferDoctorId) {
      alert('Room ID and Doctor ID are required for IPD admissions');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/emergency/admissions/${selectedAdmission.id}/transfer-ipd`, {
        room_id: transferRoomId,
        doctor_id: transferDoctorId,
        initial_deposit: parseFloat(transferDeposit) || 0.0
      });
      setShowTransferModal(false);
      setTransferRoomId('');
      setTransferDoctorId('');
      setTransferDeposit('0');
      setSelectedAdmission(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to transfer patient to IPD');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormAge(''); setFormGender('Male'); setFormPhone('');
    setFormComplaint(''); setFormTriageScore(3); setFormTriageCategory('yellow');
    setFormDoctorId(''); setFormBedNumber(''); setFormNotes('');
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.put(`/api/emergency/admissions/${id}`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const triageColor = (cat: string) => {
    const norm = cat.toLowerCase();
    switch (norm) {
      case 'red': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      case 'orange': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
      case 'yellow': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      case 'green': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Emergency Room Cockpit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Live ER triage levels, bed occupancy states, and direct IPD transition wizards.</p>
        </div>
        <button
          onClick={() => setShowAdmitModal(true)}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Quick ER Admit
        </button>
      </div>

      {/* Live Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3 text-xs">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-slate-400 block uppercase">Active ER</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{stats.total_active}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-red-600 block uppercase">Critical (Red)</p>
            <p className="text-xl font-bold text-red-700 mt-1">{stats.by_triage.red}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-orange-600 block uppercase">Very Urgent (Or.)</p>
            <p className="text-xl font-bold text-orange-700 mt-1">{stats.by_triage.orange}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-amber-600 block uppercase">Urgent (Yel.)</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{stats.by_triage.yellow}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-emerald-600 block uppercase">Standard (Grn.)</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{stats.by_triage.green}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-blue-600 block uppercase">Non-Urgent (Blu.)</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{stats.by_triage.blue}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-slate-400 block uppercase">IPD Transferred</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{stats.by_status.ipd_transferred}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center font-semibold">
            <p className="text-[10px] text-slate-400 block uppercase">Discharged</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{stats.by_status.discharged}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 max-w-sm text-xs font-bold">
        {[
          { key: 'admitted', label: 'Active' },
          { key: 'ipd_transferred', label: 'Transferred' },
          { key: 'discharged', label: 'Discharged' },
          { key: '', label: 'All Cases' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
              filterStatus === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Admissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
          </div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold italic">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No active emergency patients admitted.
          </div>
        ) : (
          admissions.map((adm) => {
            const tc = triageColor(adm.triage_category);
            return (
              <div key={adm.id} className={`bg-white border ${tc.border} rounded-xl p-5 hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Triage Badge */}
                    <div className={`${tc.bg} ${tc.text} px-3 py-2 rounded-lg text-center min-w-[90px] border`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${tc.dot} mx-auto mb-1`} />
                      <p className="text-[10px] font-bold uppercase">{adm.triage_category}</p>
                      <p className="text-base font-bold">{adm.triage_score}/5</p>
                    </div>

                    {/* Patient Info */}
                    <div className="text-xs font-semibold">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {adm.patient_name || 'Unknown Patient'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                        {adm.patient_age && <span>{adm.patient_age}y / {adm.patient_gender}</span>}
                        {adm.patient_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{adm.patient_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="h-3 w-3" />{formatTime(adm.created_at)}
                        </span>
                      </div>
                      
                      {adm.chief_complaint && (
                        <p className="text-xs text-slate-700 mt-2.5">
                          <span className="font-bold text-slate-500 uppercase text-[9px] mr-1 block">Chief Complaint:</span> {adm.chief_complaint}
                        </p>
                      )}
                      
                      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Attending Doctor</span>
                          <span className="text-slate-800 font-bold">{adm.attending_doctor_name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Emergency Bed</span>
                          <span className="text-slate-800 font-bold font-mono">{adm.assigned_bed_number || 'Unallocated'}</span>
                        </div>
                      </div>

                      {adm.notes && (
                        <p className="text-[11px] text-slate-400 mt-2.5 italic">Note: {adm.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4 text-xs font-bold">
                    {adm.status === 'admitted' && (
                      <>
                        <button
                          onClick={() => { setSelectedAdmission(adm); setShowAssignModal(true); }}
                          className="flex items-center gap-1 text-slate-700 border border-slate-300 hover:bg-slate-50 px-2.5 py-1.5 rounded font-sans cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Assign Bed/Dr
                        </button>
                        <button
                          onClick={() => { setSelectedAdmission(adm); setShowTransferModal(true); }}
                          className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors font-sans cursor-pointer"
                        >
                          <ArrowRight className="h-3.5 w-3.5" /> Transfer to IPD
                        </button>
                        <button
                          onClick={() => updateStatus(adm.id, 'discharged')}
                          className="flex items-center gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent px-2.5 py-1.5 rounded transition-all font-sans cursor-pointer"
                        >
                          Discharge
                        </button>
                      </>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-center uppercase tracking-wider ${
                      adm.status === 'admitted' ? 'bg-red-50 text-red-700 border border-red-200' :
                      adm.status === 'ipd_transferred' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {adm.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Admit Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5" />
                Quick ER Admission Registry
              </h2>
              <button onClick={() => { setShowAdmitModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm">
                &times;
              </button>
            </div>

            <form onSubmit={handleAdmit} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Patient Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Name (if known)"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Age</label>
                  <input
                    type="number"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    placeholder="Age"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Chief Complaint</label>
                <input
                  type="text"
                  value={formComplaint}
                  onChange={(e) => setFormComplaint(e.target.value)}
                  placeholder="Chest pain, trauma, breathing difficulty..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Allocation */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Attending ER Doctor</label>
                  <select
                    value={formDoctorId}
                    onChange={(e) => setFormDoctorId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Assigned ER Bed</label>
                  <input
                    type="text"
                    placeholder="e.g. Bed-01"
                    value={formBedNumber}
                    onChange={(e) => setFormBedNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Triage Section */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Triage Classification</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'red', label: 'Critical', color: 'border-red-400 bg-red-50 text-red-700' },
                    { key: 'orange', label: 'Very Urgent', color: 'border-orange-400 bg-orange-50 text-orange-700' },
                    { key: 'yellow', label: 'Urgent', color: 'border-amber-400 bg-amber-50 text-amber-700' },
                    { key: 'green', label: 'Standard', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                    { key: 'blue', label: 'Non-Urgent', color: 'border-blue-400 bg-blue-50 text-blue-700' }
                  ].map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFormTriageCategory(t.key)}
                      className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                        formTriageCategory === t.key
                          ? `${t.color} ring-1 ring-red-500`
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Score (1 critical — 5 non-urgent)</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={formTriageScore}
                    onChange={(e) => setFormTriageScore(parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1 (Critical)</span>
                    <span className="font-bold text-slate-700 text-xs">{formTriageScore}</span>
                    <span>5 (Non-urgent)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Clinical Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setShowAdmitModal(false); resetForm(); }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Admitting...' : 'Admit to ER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Bed & Doctor Modal */}
      {showAssignModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Assign Bed & Doctor</h3>
            <p className="text-xs text-slate-500">Patient: <span className="font-bold text-slate-700">{selectedAdmission.patient_name}</span></p>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Attending Doctor</label>
                <select
                  value={assignDoctorId}
                  onChange={(e) => setAssignDoctorId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Assigned ER Bed</label>
                <input
                  type="text"
                  placeholder="e.g. Bed-04"
                  value={assignBedNumber}
                  onChange={(e) => setAssignBedNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setSelectedAdmission(null); }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer disabled:opacity-50"
                >
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer to IPD Modal */}
      {showTransferModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-blue-700">Admit & Transfer to IPD</h3>
            <p className="text-xs text-slate-500">ER Case Conversion: <span className="font-bold text-slate-700">{selectedAdmission.patient_name}</span></p>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">IPD Room & Ward</label>
                <select
                  required
                  value={transferRoomId}
                  onChange={(e) => setTransferRoomId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.room_type}) - {r.occupancy_status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">IPD Admitting Doctor</label>
                <select
                  required
                  value={transferDoctorId}
                  onChange={(e) => setTransferDoctorId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Initial Deposit (INR)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={transferDeposit}
                  onChange={(e) => setTransferDeposit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setShowTransferModal(false); setSelectedAdmission(null); }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer disabled:opacity-50"
                >
                  Convert to IPD Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmergencyDashboard;
