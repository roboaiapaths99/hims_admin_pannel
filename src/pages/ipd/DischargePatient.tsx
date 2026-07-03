import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Building, User, Bed, AlertCircle, Loader2, ArrowLeft, 
  CheckCircle, FileText, Activity 
} from 'lucide-react';

interface Admission {
  id: string;
  patient_name: string;
  patient_mrn: string;
  doctor_name: string;
  room_number: string;
  room_type: string;
  admission_date: string;
}

export const DischargePatient: React.FC = () => {
  const { admissionId } = useParams<{ admissionId: string }>();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [postDischargeMedications, setPostDischargeMedications] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmission();
  }, [admissionId]);

  const fetchAdmission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/ipd/admissions/${admissionId}`);
      setAdmission(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load patient admission record.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeSummary.trim()) {
      setError('Discharge summary/instructions are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const summaryText = `DISCHARGE SUMMARY:\n${dischargeSummary}\n\nMEDICATIONS:\n${postDischargeMedications || 'None'}\n\nFOLLOW-UP:\n${followUpDate || 'As needed'}`;
      await apiClient.post(`/api/ipd/admissions/${admissionId}/discharge`, {
        discharge_summary: summaryText
      });
      navigate('/ipd/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to complete patient discharge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-sm font-semibold text-slate-500">Loading Patient Summary...</p>
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="py-12 max-w-lg mx-auto space-y-4 text-center font-sans">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Record Load Error</h3>
        <p className="text-slate-500 text-sm">{error || 'Admission record not found.'}</p>
        <button
          onClick={() => navigate('/ipd/dashboard')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-3xl mx-auto">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(`/ipd/workspace/${admissionId}`)}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Patient Discharge Summary</h1>
          <p className="text-slate-500 text-xs">Prepare clinical discharge instructions, finalize post-admission treatment charts, and release bed allocation.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Patient info ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Name / MRN</div>
          <div className="text-sm font-extrabold text-slate-800 mt-1">{admission.patient_name}</div>
          <div className="text-xs text-teal-600 font-semibold">{admission.patient_mrn}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attending Physician</div>
          <div className="text-sm font-bold text-slate-800 mt-1">{admission.doctor_name}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Bed Room</div>
          <div className="text-sm font-bold text-slate-800 mt-1">Room {admission.room_number} ({admission.room_type})</div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleDischarge} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center border-b border-slate-100 pb-2">
              <FileText className="h-4.5 w-4.5 text-teal-600 mr-1.5" /> 1. Clinical Case Summary
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chief discharge instructions & findings</label>
              <textarea
                required
                rows={4}
                value={dischargeSummary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                className="mt-1.5 w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Include patient surgical recovery, daily rounding summary details, post-op instructions..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Post-discharge medications & dosage</label>
              <textarea
                rows={3}
                value={postDischargeMedications}
                onChange={(e) => setPostDischargeMedications(e.target.value)}
                className="mt-1.5 w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Paracetamol 650mg (1-0-1) post food - 5 Days"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center border-b border-slate-100 pb-2">
              <Activity className="h-4.5 w-4.5 text-teal-600 mr-1.5" /> 2. Recovery Timeline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Follow-up appointment date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Releasing Room / Bed Accommodation</label>
                <input
                  type="text"
                  disabled
                  value={`Room ${admission.room_number} status will automatically return to 'available'`}
                  className="mt-1.5 block w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/ipd/workspace/${admissionId}`)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-sm font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center items-center px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Completing Discharge...
                </>
              ) : (
                'Finalize Clinical Discharge'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DischargePatient;
