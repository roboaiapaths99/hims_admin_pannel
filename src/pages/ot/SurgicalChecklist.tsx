import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, CheckCircle, Save, Loader2, AlertCircle, 
  ShieldCheck, ListChecks, Landmark, ClipboardList, PenTool
} from 'lucide-react';

interface OTBooking {
  id: string;
  patient_name: string;
  patient_mrn: string;
  surgery_name: string;
  surgeon_name: string;
  room_number: string;
  schedule_date: string;
  status: string;
}

export const SurgicalChecklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<OTBooking | null>(null);
  const [itemsChecked, setItemsChecked] = useState<Record<string, boolean>>({});
  const [signedOffBy, setSignedOffBy] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadChecklistData();
    }
  }, [id]);

  const loadChecklistData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const bookingRes = await apiClient.get(`/api/ot/bookings/${id}`);
      setBooking(bookingRes.data);

      const checklistRes = await apiClient.get(`/api/ot/bookings/${id}/checklist`);
      setItemsChecked(checklistRes.data.items_checked || {});
      setSignedOffBy(checklistRes.data.signed_off_by || '');
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve surgical safety checklist details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCheck = (key: string) => {
    setItemsChecked(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put(`/api/ot/bookings/${id}/checklist`, {
        items_checked: itemsChecked,
        signed_off_by: signedOffBy.trim() || null
      });
      setSuccess('WHO Surgical Safety Checklist updated successfully.');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update checklist logs.');
    } finally {
      setIsSaving(false);
    }
  };

  const signInItems = [
    { key: 'si_identity', label: 'Patient has confirmed identity, site, procedure, and consent' },
    { key: 'si_site_marked', label: 'Surgical site is marked (or not applicable)' },
    { key: 'si_anesthesia_safety', label: 'Anesthesia safety check completed (machine, medications, monitor)' },
    { key: 'si_pulse_oximeter', label: 'Pulse oximeter placed on patient and functioning' },
    { key: 'si_allergies', label: 'Patient has no known allergies (or checked & documented)' },
    { key: 'si_airway_risk', label: 'Airway / aspiration risk evaluated and equipment available' },
    { key: 'si_blood_loss', label: 'Risk of >500ml blood loss (or >7ml/kg in children) check completed' }
  ];

  const timeOutItems = [
    { key: 'to_introductions', label: 'Confirm all team members introduced by name and role' },
    { key: 'to_verbal_confirm', label: 'Surgeon, anesthetist, and nurse confirm Patient name, Site, and Procedure' },
    { key: 'to_critical_surgeon', label: 'Surgeon reviews: critical/unexpected steps, duration, blood loss' },
    { key: 'to_critical_anesthetist', label: 'Anesthetist reviews: patient-specific concerns, airway issues' },
    { key: 'to_critical_nurse', label: 'Nursing team reviews: sterility indicators, equipment issues' },
    { key: 'to_antibiotics', label: 'Antibiotic prophylaxis administered in past 60 mins (or not applicable)' },
    { key: 'to_imaging', label: 'Essential diagnostic imaging displayed in the operating room' }
  ];

  const signOutItems = [
    { key: 'so_procedure_confirm', label: 'Nurse verbally confirms the name of procedure recorded' },
    { key: 'so_counts_correct', label: 'Verbal confirmation that instrument, sponge, and needle counts are correct' },
    { key: 'so_specimen_labeled', label: 'Surgical specimen is labeled correctly (including patient details)' },
    { key: 'so_equipment_issues', label: 'Any equipment malfunctions or issues addressed' },
    { key: 'so_recovery_reviews', label: 'Surgeon, anesthetist, and nurse review key concerns for recovery and management' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 font-sans">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading safety checklist logs...</p>
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
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono font-sans">WHO Surgical Safety Audit</span>
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

      {/* Booking details card header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Patient Under Care</span>
          <h4 className="text-sm font-bold mt-1">{booking?.patient_name}</h4>
          <p className="font-mono text-slate-400 text-[10px] mt-0.5">MRN: {booking?.patient_mrn}</p>
        </div>
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Surgical Procedure</span>
          <h4 className="text-sm font-bold mt-1 line-clamp-1">{booking?.surgery_name}</h4>
          <p className="text-slate-400 text-[10px] mt-0.5">Room: {booking?.room_number}</p>
        </div>
        <div>
          <span className="text-[9px] font-bold text-teal-400 uppercase font-mono tracking-wider">Primary Surgeon</span>
          <h4 className="text-sm font-bold mt-1">Dr. {booking?.surgeon_name}</h4>
          <p className="text-slate-400 text-[10px] mt-0.5">
            Status: <span className="text-teal-400 font-bold uppercase tracking-wider font-mono">{booking?.status.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Checklist Sections Form */}
      <form onSubmit={handleSaveChecklist} className="space-y-6">
        
        {/* Sign In block */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center">
            <ClipboardList className="h-4.5 w-4.5 mr-2" /> 1. SIGN IN (Before Induction of Anesthesia)
          </h3>
          <div className="space-y-3">
            {signInItems.map(item => (
              <label key={item.key} className="flex items-start space-x-3 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={!!itemsChecked[item.key]}
                  onChange={() => handleToggleCheck(item.key)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Out block */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center">
            <ClipboardList className="h-4.5 w-4.5 mr-2" /> 2. TIME OUT (Before Skin Incision)
          </h3>
          <div className="space-y-3">
            {timeOutItems.map(item => (
              <label key={item.key} className="flex items-start space-x-3 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={!!itemsChecked[item.key]}
                  onChange={() => handleToggleCheck(item.key)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sign Out block */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center">
            <ClipboardList className="h-4.5 w-4.5 mr-2" /> 3. SIGN OUT (Before Patient Leaves Operating Room)
          </h3>
          <div className="space-y-3">
            {signOutItems.map(item => (
              <label key={item.key} className="flex items-start space-x-3 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={!!itemsChecked[item.key]}
                  onChange={() => handleToggleCheck(item.key)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sign-Off block */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm space-y-1 text-xs font-semibold">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Authorized Staff Sign-Off Signature</label>
            <div className="relative rounded shadow-sm mt-1">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <PenTool className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                placeholder="Enter Staff Name (e.g. Dr. R. Sharma, OT Lead)"
                value={signedOffBy}
                onChange={(e) => setSignedOffBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0 text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                  Saving updates...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save & Authorize Checklist
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default SurgicalChecklist;
