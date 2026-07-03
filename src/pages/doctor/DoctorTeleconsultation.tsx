import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { 
  ArrowLeft, Heart, Thermometer, FileText, Plus, X, 
  Search, Save, CheckCircle, Loader2, AlertCircle, RefreshCw, Activity, FlaskConical, Pill,
  Video, PhoneOff, Copy, Check, Info
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  blood_group?: string;
}

interface Vitals {
  bp_sys: number;
  bp_dia: number;
  pulse: number;
  temperature: number;
  spo2: number;
  height: number;
  weight: number;
  bmi: number;
  pain_score: number;
  triage_level: string;
}

interface MedicalHistory {
  allergies: string[];
  chronic_conditions: string[];
  past_surgeries?: string;
  family_history?: string;
}

interface Visit {
  id: string;
  patient_id: string;
  appointment_id: string;
  symptoms: string;
  clinical_notes: string;
  diagnosis: string[];
  treatment_plan: string;
  status: string;
}

interface Icd15Code {
  code: string;
  name: string;
}

interface LabOrderItem {
  test_id: string;
  test_name: string;
  test_code: string;
  price: number;
}

interface LabOrder {
  id: string;
  patient_id: string;
  visit_id: string;
  items: LabOrderItem[];
  status: 'ordered' | 'sample_collected' | 'result_entered' | 'verified';
  doctor_name: string;
  created_at: string;
}

interface LabTestMaster {
  id: string;
  test_name: string;
  test_code: string;
  price: number;
  normal_range: string;
  unit: string;
  is_active: boolean;
}

interface LabResultEntry {
  test_id: string;
  test_name: string;
  result_value: string;
  normal_range: string;
  unit: string;
  abnormal_flag: boolean;
}

interface LabResult {
  id: string;
  lab_order_id: string;
  results: LabResultEntry[];
  pdf_url?: string;
  created_at: string;
}

export const DoctorTeleconsultation: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // Telemedicine session state
  const [session, setSession] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isClosingCall, setIsClosingCall] = useState(false);

  // EMR state (synced with Visit details)
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [currentVitals, setCurrentVitals] = useState<Vitals | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);

  // Diagnostic Autocomplete
  const [diagQuery, setDiagQuery] = useState('');
  const [diagSuggestions, setDiagSuggestions] = useState<Icd15Code[]>([]);
  const [isSearchingDiag, setIsSearchingDiag] = useState(false);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);

  // Clinical note inputs
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Lab Ordering
  const [labTests, setLabTests] = useState<LabTestMaster[]>([]);
  const [searchLabQuery, setSearchLabQuery] = useState('');
  const [selectedLabTests, setSelectedLabTests] = useState<LabTestMaster[]>([]);
  const [existingLabOrders, setExistingLabOrders] = useState<LabOrder[]>([]);
  const [isOrderingLabs, setIsOrderingLabs] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [labOrderResults, setLabOrderResults] = useState<Record<string, LabResult>>({});

  // E-Prescription Ordering
  const [medicationSearchQuery, setMedicationSearchQuery] = useState('');
  const [medicationsSuggestions, setMedicationsSuggestions] = useState<any[]>([]);
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState<any[]>([]);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>([]);
  const [isOrderingPrescription, setIsOrderingPrescription] = useState(false);

  // Pharmacy inputs
  const [prescDosage, setPrescDosage] = useState('1-0-1');
  const [prescFreq, setPrescFreq] = useState('Daily');
  const [prescDuration, setPrescDuration] = useState('5 days');
  const [prescQty, setPrescQty] = useState(10);
  const [prescInst, setPrescInst] = useState('After food');

  // Page Loaders / Feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initial Load: Fetch Session & start/retrieve EMR Visit details
  useEffect(() => {
    if (sessionId) {
      loadTelemedicineAndEMR();
    }
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [sessionId]);

  const loadTelemedicineAndEMR = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // a. Fetch Telemedicine Session
      const sessionRes = await apiClient.get(`/api/telemedicine/sessions/${sessionId}`);
      const sessionData = sessionRes.data;
      setSession(sessionData);

      if (sessionData.status === 'closed') {
        setError('This teleconsultation room has already been closed.');
        setIsLoading(false);
        return;
      }

      // b. Start/Fetch EMR Visit using appointment ID
      const visitRes = await apiClient.post('/api/consultation/visit/start', {
        appointment_id: sessionData.appointment_id
      });
      const visitData = visitRes.data;
      setVisit(visitData);
      setSymptoms(visitData.symptoms || '');
      setClinicalNotes(visitData.clinical_notes || '');
      setTreatmentPlan(visitData.treatment_plan || '');
      setSelectedDiagnoses(visitData.diagnosis || []);

      // c. Fetch Patient Demographics
      const patientRes = await apiClient.get(`/api/patients/${visitData.patient_id}`);
      setPatient(patientRes.data);

      // d. Fetch Vitals & Medical History
      try {
        const vitalsRes = await apiClient.get(`/api/vitals/patient/${visitData.patient_id}`);
        if (vitalsRes.data.length > 0) {
          setCurrentVitals(vitalsRes.data[0]);
        }
      } catch (e) {
        console.warn('Vitals unavailable', e);
      }

      try {
        const historyRes = await apiClient.get(`/api/patients/${visitData.patient_id}/medical-history`);
        setMedicalHistory(historyRes.data);
      } catch (e) {
        console.warn('Medical history unavailable', e);
      }

      // e. Fetch Lab orders & Config
      const labsRes = await apiClient.get('/api/labs/orders', { params: { visit_id: visitData.id } });
      setExistingLabOrders(labsRes.data);

      const masterLabsRes = await apiClient.get('/api/config/lab-tests');
      setLabTests(masterLabsRes.data);

      // f. Fetch Prescriptions
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions', { params: { visit_id: visitData.id } });
      setExistingPrescriptions(prescRes.data);

    } catch (err: any) {
      console.error(err);
      setError('Failed to load telemedicine session or EMR records.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Initialize Jitsi IFrame API once container element is mounted & session is ready
  useEffect(() => {
    if (isLoading || !session || session.status === 'closed' || !jitsiContainerRef.current) return;

    const scriptId = 'jitsi-external-api';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initJitsi = () => {
      if ((window as any).JitsiMeetExternalAPI && jitsiContainerRef.current) {
        // Clear container to prevent duplicate mountings
        jitsiContainerRef.current.innerHTML = '';

        const domain = session.jitsi_domain || 'meet.jit.si';
        const options = {
          roomName: session.room_name,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: user?.name ? `Dr. ${user.name}` : 'Doctor'
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'chat', 'settings',
              'videoquality', 'tileview', 'mute-everyone'
            ],
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            MOBILE_APP_PROMO: false
          }
        };

        const api = new (window as any).JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceLeft', () => {
          handleEndCallSession();
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://${session.jitsi_domain || 'meet.jit.si'}/external_api.js`;
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [isLoading, session]);

  // 3. EMR Handlers
  const handleDiagnosisSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDiagQuery(val);
    if (val.length < 2) {
      setDiagSuggestions([]);
      return;
    }

    setIsSearchingDiag(true);
    try {
      const res = await apiClient.get('/api/consultation/icd10', { params: { q: val } });
      setDiagSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingDiag(false);
    }
  };

  const handleAddDiagnosis = (code: Icd15Code) => {
    const entry = `${code.code} - ${code.name}`;
    if (!selectedDiagnoses.includes(entry)) {
      setSelectedDiagnoses([...selectedDiagnoses, entry]);
    }
    setDiagQuery('');
    setDiagSuggestions([]);
  };

  const handleRemoveDiagnosis = (entry: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== entry));
  };

  const handleSaveVisit = async (isComplete = false) => {
    if (!visit) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      symptoms,
      clinical_notes: clinicalNotes,
      diagnosis: selectedDiagnoses,
      treatment_plan: treatmentPlan
    };

    const endpoint = isComplete ? `/api/consultation/visit/${visit.id}/complete` : `/api/consultation/visit/${visit.id}/save`;

    try {
      const res = await apiClient.post(endpoint, payload);
      setVisit(res.data);
      if (isComplete) {
        setSuccessMsg('EMR Consultation completed successfully.');
        // Also close the call session on complete
        await handleEndCallSession(false);
        navigate('/doctor/dashboard');
      } else {
        setSuccessMsg('Consultation progress saved successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update EMR records.');
    } finally {
      setIsSaving(false);
    }
  };

  // Lab module helpers
  const handleSelectLabTest = (test: LabTestMaster) => {
    if (!selectedLabTests.some(t => t.id === test.id)) {
      setSelectedLabTests([...selectedLabTests, test]);
    }
    setSearchLabQuery('');
  };

  const handleRemoveSelectedLabTest = (testId: string) => {
    setSelectedLabTests(selectedLabTests.filter(t => t.id !== testId));
  };

  const handleOrderLabs = async () => {
    if (selectedLabTests.length === 0 || !visit) return;
    setIsOrderingLabs(true);
    setError(null);
    try {
      const items = selectedLabTests.map(t => ({
        test_id: t.test_code,
        test_name: t.test_name,
        test_code: t.test_code,
        price: t.price
      }));

      const payload = {
        patient_id: visit.patient_id,
        visit_id: visit.id,
        items
      };

      await apiClient.post('/api/labs/orders', payload);
      setSelectedLabTests([]);
      setSuccessMsg('Lab tests ordered successfully.');
      
      const labsRes = await apiClient.get('/api/labs/orders', { params: { visit_id: visit.id } });
      setExistingLabOrders(labsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to order lab tests.');
    } finally {
      setIsOrderingLabs(false);
    }
  };

  const toggleLabOrderExpand = async (orderId: string, status: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);

    if (['result_entered', 'verified'].includes(status) && !labOrderResults[orderId]) {
      try {
        const res = await apiClient.get(`/api/labs/orders/${orderId}/results`);
        setLabOrderResults(prev => ({ ...prev, [orderId]: res.data }));
      } catch (err) {
        console.error('Failed to load lab results:', err);
      }
    }
  };

  // Pharmacy e-prescription helpers
  const handleMedicationSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMedicationSearchQuery(val);
    if (val.length < 2) {
      setMedicationsSuggestions([]);
      return;
    }
    try {
      const res = await apiClient.get('/api/pharmacy/inventory/search', { params: { q: val } });
      setMedicationsSuggestions(res.data);
    } catch (err) {
      console.error('Failed to search inventory medications:', err);
    }
  };

  const handleAddMedication = (med: any) => {
    const isAlreadySelected = selectedPrescriptionItems.some(i => i.medicine_id === med.id);
    if (!isAlreadySelected) {
      setSelectedPrescriptionItems([...selectedPrescriptionItems, {
        medicine_id: med.id,
        medicine_name: med.medicine_name,
        dosage: prescDosage,
        frequency: prescFreq,
        duration: prescDuration,
        instructions: prescInst,
        quantity_prescribed: prescQty
      }]);
    }
    setMedicationSearchQuery('');
    setMedicationsSuggestions([]);
  };

  const handleRemovePrescriptionItem = (medId: string) => {
    setSelectedPrescriptionItems(selectedPrescriptionItems.filter(i => i.medicine_id !== medId));
  };

  const handleCreatePrescription = async () => {
    if (selectedPrescriptionItems.length === 0 || !visit) return;
    setIsOrderingPrescription(true);
    setError(null);
    try {
      const payload = {
        patient_id: visit.patient_id,
        visit_id: visit.id,
        items: selectedPrescriptionItems
      };
      await apiClient.post('/api/pharmacy/prescriptions', payload);
      setSelectedPrescriptionItems([]);
      setSuccessMsg('E-Prescription created and stock reserved successfully.');
      
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions', { params: { visit_id: visit.id } });
      setExistingPrescriptions(prescRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit e-prescription.');
    } finally {
      setIsOrderingPrescription(false);
    }
  };

  // Close the active telemedicine room session
  const handleEndCallSession = async (redirect = true) => {
    if (!sessionId) return;
    setIsClosingCall(true);
    try {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      await apiClient.put(`/api/telemedicine/sessions/${sessionId}/close`);
      setSession((prev: any) => prev ? { ...prev, status: 'closed' } : null);
      if (redirect) {
        navigate('/doctor/dashboard');
      }
    } catch (err) {
      console.error('Failed to close call session:', err);
    } finally {
      setIsClosingCall(false);
    }
  };

  // Copy patient invitation link
  const copyPatientLink = () => {
    const link = `${window.location.origin}/patient/teleconsultation/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin h-10 w-10 text-teal-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Initiating Split-Screen Consultation Workspace...</p>
        </div>
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">Teleconsultation Unreachable</h2>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">{error}</p>
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] font-sans bg-slate-50 overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit Workspace
          </button>
          <div className="h-4 w-px bg-slate-200" />
          {patient && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-800">{patient.first_name} {patient.last_name}</span>
              <span className="text-slate-400 font-mono">({patient.gender}, {calculateAge(patient.dob)} Yrs, MRN: {patient.mrn})</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={copyPatientLink}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              copiedLink 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copiedLink ? 'Copied Invite' : 'Copy Patient Link'}
          </button>

          <button
            onClick={() => handleSaveVisit(false)}
            disabled={isSaving}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 mr-1" /> Save EMR Draft
          </button>

          <button
            onClick={() => handleSaveVisit(true)}
            disabled={isSaving}
            className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete Consult
          </button>

          <button
            onClick={() => handleEndCallSession()}
            disabled={isClosingCall}
            className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1" /> End Call
          </button>
        </div>
      </div>

      {/* Main Split Screen Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Live Video Room */}
        <div className="w-[50%] flex flex-col border-r border-slate-200 bg-slate-900 overflow-hidden relative">
          {session?.status === 'closed' ? (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 text-center space-y-4">
              <PhoneOff className="h-16 w-16 text-slate-600" />
              <h3 className="text-md font-bold text-slate-300">Video Call Finished</h3>
              <p className="text-xs text-slate-500 max-w-sm">The telemedicine conference has been closed. You can continue writing and finalising EMR notes on the right side.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative">
              {/* Jitsi meet frame wrapper */}
              <div ref={jitsiContainerRef} className="flex-1 w-full h-full bg-slate-950" id="jitsi-container" />
              
              {/* Overlay Room Detail Bar */}
              <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-2 font-mono shadow-lg">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Room: {session?.room_name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: EMR Notes & Treatment Workspace */}
        <div className="w-[50%] flex flex-col bg-white overflow-y-auto">
          {error && (
            <div className="m-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="m-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3 shrink-0">
              <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-teal-800">{successMsg}</p>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Patient Clinical Profile Info card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest font-mono">Telemedicine Consultation Case</span>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{patient?.first_name} {patient?.last_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">MRN: {patient?.mrn} | DOB: {patient?.dob && new Date(patient.dob).toLocaleDateString()}</p>
                </div>
                {currentVitals && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    currentVitals.triage_level === 'red' ? 'bg-red-50 text-red-700' :
                    currentVitals.triage_level === 'yellow' ? 'bg-amber-50 text-amber-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    Triage: {currentVitals.triage_level}
                  </span>
                )}
              </div>

              {currentVitals && (
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-[11px] font-mono text-slate-600">
                  <div>
                    <span className="text-slate-400">BP:</span> {currentVitals.bp_sys}/{currentVitals.bp_dia}
                  </div>
                  <div>
                    <span className="text-slate-400">Pulse:</span> {currentVitals.pulse} bpm
                  </div>
                  <div>
                    <span className="text-slate-400">Temp:</span> {currentVitals.temperature} °F
                  </div>
                  <div>
                    <span className="text-slate-400">SpO2:</span> {currentVitals.spo2}%
                  </div>
                  <div>
                    <span className="text-slate-400">Weight:</span> {currentVitals.weight}kg
                  </div>
                  <div>
                    <span className="text-slate-400">BMI:</span> {currentVitals.bmi}
                  </div>
                </div>
              )}
            </div>

            {/* Medical History */}
            {medicalHistory && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Known Medical History</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Allergies</span>
                    <p className="text-slate-700 mt-0.5">
                      {medicalHistory.allergies.length === 0 ? 'None' : medicalHistory.allergies.join(', ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Chronic Conditions</span>
                    <p className="text-slate-700 mt-0.5">
                      {medicalHistory.chronic_conditions.length === 0 ? 'None' : medicalHistory.chronic_conditions.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* symptoms and complaints */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Symptoms / Chief Complaints *</label>
              <textarea
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Describe patient complaints (e.g. cough, sore throat)..."
              />
            </div>

            {/* Clinical examination notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Clinical Examination Notes</label>
              <textarea
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Document physical details, checks, auscultation, etc."
              />
            </div>

            {/* Diagnosis (ICD-10 classification) */}
            <div className="relative space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">ICD-10 Diagnostic Classification</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search diagnostic classification..."
                  value={diagQuery}
                  onChange={handleDiagnosisSearch}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {isSearchingDiag && (
                <div className="absolute right-3 top-8">
                  <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                </div>
              )}

              {diagSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 text-xs">
                  {diagSuggestions.map(code => (
                    <button
                      key={code.code}
                      type="button"
                      onClick={() => handleAddDiagnosis(code)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold"
                    >
                      <span>{code.name}</span>
                      <span className="text-teal-700 font-mono font-bold ml-4">{code.code}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedDiagnoses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDiagnoses.map(diag => (
                    <span 
                      key={diag} 
                      className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] rounded-full font-bold"
                    >
                      {diag}
                      <button
                        type="button"
                        onClick={() => handleRemoveDiagnosis(diag)}
                        className="ml-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Treatment plan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Treatment Plan & General Advice</label>
              <textarea
                rows={3}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Prescribe instructions, advice, dietary warnings, rest duration, follow-ups..."
              />
            </div>

            {/* Lab order diagnostics panel */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center">
                  <FlaskConical className="h-4 w-4 text-teal-600 mr-1.5" /> Laboratory Diagnostics
                </h4>
                <p className="text-[10px] text-slate-400">Order lab reports or diagnostic tests dynamically.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search test names (e.g. CBC)..."
                    value={searchLabQuery}
                    onChange={(e) => setSearchLabQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-4 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  
                  {searchLabQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto z-20 text-xs">
                      {labTests
                        .filter(t => t.test_name.toLowerCase().includes(searchLabQuery.toLowerCase()) || t.test_code.toLowerCase().includes(searchLabQuery.toLowerCase()))
                        .map(test => (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => handleSelectLabTest(test)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold"
                          >
                            <span>{test.test_name}</span>
                            <span className="text-slate-500 font-mono text-[10px] font-bold">₹{test.price}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>

                {selectedLabTests.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {selectedLabTests.map(test => (
                        <span key={test.id} className="inline-flex items-center px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] rounded font-bold">
                          {test.test_name}
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedLabTest(test.id)}
                            className="ml-1.5 text-teal-600 hover:text-teal-800 font-bold"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-[11px]">
                      <span className="font-bold text-slate-700">Estimate: ₹{selectedLabTests.reduce((sum, t) => sum + t.price, 0)}</span>
                      <button
                        type="button"
                        onClick={handleOrderLabs}
                        disabled={isOrderingLabs}
                        className="px-2 py-1 bg-teal-600 text-white rounded text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                      >
                        Order Labs
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing lab orders */}
              {existingLabOrders.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visit Lab Orders</span>
                  {existingLabOrders.map(order => {
                    const isExpanded = expandedOrderId === order.id;
                    const resultsObj = labOrderResults[order.id];
                    return (
                      <div key={order.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                        <button
                          type="button"
                          onClick={() => toggleLabOrderExpand(order.id, order.status)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-700">{order.items.map(i => i.test_name).join(', ')}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Date: {new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            order.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>{order.status}</span>
                        </button>
                        {isExpanded && resultsObj && (
                          <div className="p-3 bg-slate-50/50 space-y-2 font-mono text-[11px]">
                            {resultsObj.results?.map(res => (
                              <div key={res.test_id} className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="font-bold text-slate-600">{res.test_name}</span>
                                <span className={res.abnormal_flag ? 'text-red-600 font-bold' : 'text-slate-800'}>
                                  {res.result_value} {res.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* E-Prescription panel */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center">
                  <Pill className="h-4 w-4 text-teal-600 mr-1.5" /> E-Prescription Builder
                </h4>
                <p className="text-[10px] text-slate-400">Search drugs and prescribe medication directions directly.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                  <div>
                    <label>Dosage</label>
                    <input
                      type="text"
                      value={prescDosage}
                      onChange={(e) => setPrescDosage(e.target.value)}
                      className="mt-1 block w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label>Frequency</label>
                    <select
                      value={prescFreq}
                      onChange={(e) => setPrescFreq(e.target.value)}
                      className="mt-1 block w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-bold"
                    >
                      <option value="Daily">Daily</option>
                      <option value="OD">Once Daily (OD)</option>
                      <option value="BD">Twice Daily (BD)</option>
                      <option value="TDS">Thrice Daily (TDS)</option>
                      <option value="PRN">As Needed (PRN)</option>
                    </select>
                  </div>
                  <div>
                    <label>Duration</label>
                    <input
                      type="text"
                      value={prescDuration}
                      onChange={(e) => setPrescDuration(e.target.value)}
                      className="mt-1 block w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                  <div>
                    <label>Qty to Dispense</label>
                    <input
                      type="number"
                      value={prescQty}
                      onChange={(e) => setPrescQty(parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label>Instructions</label>
                    <input
                      type="text"
                      value={prescInst}
                      onChange={(e) => setPrescInst(e.target.value)}
                      className="mt-1 block w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="relative border-t border-slate-200/60 pt-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Search & Select Drug</span>
                  <Search className="absolute left-2.5 top-8.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search medication inventory..."
                    value={medicationSearchQuery}
                    onChange={handleMedicationSearch}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-4 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  
                  {medicationsSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto z-20 text-xs">
                      {medicationsSuggestions.map(med => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => handleAddMedication(med)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold"
                        >
                          <span>{med.medicine_name}</span>
                          <span className="text-teal-700 font-bold text-[10px]">Stock: {med.quantity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPrescriptionItems.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded overflow-hidden">
                      {selectedPrescriptionItems.map(item => (
                        <div key={item.medicine_id} className="p-2.5 flex justify-between items-center text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{item.medicine_name}</span>
                            <span className="text-slate-400 block font-mono text-[10px]">
                              {item.dosage} | {item.frequency} | {item.duration} ({item.quantity_prescribed} pcs)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePrescriptionItem(item.medicine_id)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={handleCreatePrescription}
                        disabled={isOrderingPrescription}
                        className="px-2 py-1.5 bg-teal-600 text-white rounded text-[10px] font-bold shadow disabled:opacity-50 cursor-pointer"
                      >
                        Submit Prescription
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing prescriptions */}
              {existingPrescriptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prescription Ledger</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2 font-mono">
                    {existingPrescriptions.map(p => (
                      <div key={p.id} className="border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                        <span className="text-[10px] text-slate-400 block font-sans">Rx Order ID: {p.id}</span>
                        {p.items?.map((it: any) => (
                          <div key={it.medicine_id} className="flex justify-between text-[11px] mt-1 font-semibold text-slate-700">
                            <span>{it.medicine_name}</span>
                            <span>{it.dosage} ({it.frequency} - {it.duration})</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DoctorTeleconsultation;
