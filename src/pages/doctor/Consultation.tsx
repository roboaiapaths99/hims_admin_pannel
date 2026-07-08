import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, Heart, Thermometer, Weight, FileText, Plus, X, 
  Search, Save, CheckCircle, Loader2, AlertCircle, RefreshCw, Activity, Sparkles, FlaskConical, Pill 
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

interface VisitAmendment {
  id: string;
  reason: string;
  amended_symptoms?: string;
  amended_clinical_notes?: string;
  amended_diagnosis?: string[];
  amended_treatment_plan?: string;
  amended_by: string;
  amended_by_name: string;
  amended_at: string;
}

interface Visit {
  id: string;
  patient_id: string;
  appointment_id: string;
  symptoms: string;
  clinical_notes: string;
  diagnosis: string[];
  treatment_plan?: string;
  status: string;
  is_finalized?: boolean;
  amendments?: VisitAmendment[];
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

export const Consultation: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // visit_id
  const navigate = useNavigate();

  // Consultation data
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [currentVitals, setCurrentVitals] = useState<Vitals | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [pastVisits, setPastVisits] = useState<any[]>([]);

  // Auto-complete Diagnosis states
  const [diagQuery, setDiagQuery] = useState('');
  const [diagSuggestions, setDiagSuggestions] = useState<Icd15Code[]>([]);
  const [isSearchingDiag, setIsSearchingDiag] = useState(false);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);

  // Main Consultation fields
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Lab Module state
  const [labTests, setLabTests] = useState<LabTestMaster[]>([]);
  const [searchLabQuery, setSearchLabQuery] = useState('');
  const [selectedLabTests, setSelectedLabTests] = useState<LabTestMaster[]>([]);
  const [existingLabOrders, setExistingLabOrders] = useState<LabOrder[]>([]);
  const [isOrderingLabs, setIsOrderingLabs] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [labOrderResults, setLabOrderResults] = useState<Record<string, LabResult>>({});

  // Radiology Module state
  interface RadiologyOrder {
    id: string;
    modality: string;
    test_name: string;
    status: string;
    created_at: string;
  }
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([]);
  const [radModality, setRadModality] = useState('XRAY');
  const [radTestName, setRadTestName] = useState('');
  const [isOrderingRadiology, setIsOrderingRadiology] = useState(false);

  // E-Prescription & Pharmacy state
  const [medicationSearchQuery, setMedicationSearchQuery] = useState('');
  const [medicationsSuggestions, setMedicationsSuggestions] = useState<any[]>([]);
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState<any[]>([]);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>([]);
  const [isOrderingPrescription, setIsOrderingPrescription] = useState(false);

  // E-Prescription item form state
  const [prescDosage, setPrescDosage] = useState('1-0-1');
  const [prescFreq, setPrescFreq] = useState('Daily');
  const [prescDuration, setPrescDuration] = useState('5 days');
  const [prescQty, setPrescQty] = useState(10);
  const [prescInst, setPrescInst] = useState('After food');

  // Loaders / Messages
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // DMS Integration variables
  const [dmsSummary, setDmsSummary] = useState<any>(null);
  const [dmsTimeline, setDmsTimeline] = useState<any[]>([]);
  const [dmsLeftTab, setDmsLeftTab] = useState<'summary' | 'timeline'>('summary');
  
  // Similar Cases
  const [similarCases, setSimilarCases] = useState<any[]>([]);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
  const [similarSearchQuery, setSimilarSearchQuery] = useState('');

  // EMR Amendment states
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amendSymptoms, setAmendSymptoms] = useState('');
  const [amendClinicalNotes, setAmendClinicalNotes] = useState('');
  const [amendTreatmentPlan, setAmendTreatmentPlan] = useState('');
  const [amendDiagnosis, setAmendDiagnosis] = useState<string[]>([]);
  const [amendDiagQuery, setAmendDiagQuery] = useState('');
  const [amendDiagSuggestions, setAmendDiagSuggestions] = useState<Icd15Code[]>([]);
  const [isSearchingAmendDiag, setIsSearchingAmendDiag] = useState(false);
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);

  // ✨ AI Clinical Copilot & Patient Translator states
  const [aiCopilotSummary, setAiCopilotSummary] = useState('');
  const [aiCopilotInstructions, setAiCopilotInstructions] = useState('');
  const [isSummarizingAI, setIsSummarizingAI] = useState(false);
  const [isSimplifyingAI, setIsSimplifyingAI] = useState(false);
  const [aiTargetLanguage, setAiTargetLanguage] = useState('Hindi');

  const handleGenerateAISummary = async () => {
    if (!id) return;
    setIsSummarizingAI(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        patient_id: visit?.patient_id || '',
        symptoms: symptoms || 'None',
        clinical_notes: clinicalNotes || 'None',
        diagnosis: selectedDiagnoses.length > 0 ? selectedDiagnoses : ['None']
      };
      const res = await apiClient.post('/api/ai/visit-summarize', payload);
      setAiCopilotSummary(res.data.generated_text);
      setSuccessMsg('AI clinical summary generated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate AI summary.');
    } finally {
      setIsSummarizingAI(false);
    }
  };

  const handleSimplifyInstructions = async () => {
    if (!id) return;
    if (!treatmentPlan) {
      setError('Please write a treatment plan or instructions to simplify.');
      return;
    }
    setIsSimplifyingAI(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        patient_id: visit?.patient_id || '',
        instructions: treatmentPlan,
        target_language: aiTargetLanguage
      };
      const res = await apiClient.post('/api/ai/simplify-instructions', payload);
      setAiCopilotInstructions(res.data.generated_text);
      setSuccessMsg('Simplified patient instructions generated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to simplify instructions.');
    } finally {
      setIsSimplifyingAI(false);
    }
  };

  const handleAppendInstructions = () => {
    if (aiCopilotInstructions) {
      const current = treatmentPlan ? `${treatmentPlan}\n\n` : '';
      setTreatmentPlan(`${current}[Simplified in ${aiTargetLanguage}]:\n${aiCopilotInstructions}`);
      setSuccessMsg('Simplified instructions appended to the treatment plan.');
    }
  };

  const fetchDmsClinicalData = async (patientId: string) => {
    try {
      const summaryRes = await apiClient.get(`/api/integrations/dms/patients/${patientId}/summary`);
      setDmsSummary(summaryRes.data);
    } catch (e) {
      console.error("DMS summary fetch failed:", e);
    }

    try {
      const timelineRes = await apiClient.get(`/api/integrations/dms/patients/${patientId}/timeline`);
      setDmsTimeline(timelineRes.data);
    } catch (e) {
      console.error("DMS timeline fetch failed:", e);
    }
  };

  const handleSearchSimilarCases = async (queryText?: string) => {
    const textToSearch = queryText || similarSearchQuery || symptoms || clinicalNotes;
    if (!textToSearch.trim()) {
      alert("Please enter symptoms or clinical notes to search for similar cases.");
      return;
    }
    
    setIsSearchingSimilar(true);
    try {
      const res = await apiClient.post('/api/integrations/dms/similar-cases/search', {
        text: textToSearch,
        patient_id: patient?.id,
        max_results: 3
      });
      setSimilarCases(res.data);
    } catch (e) {
      console.error("Similar cases search failed:", e);
    } finally {
      setIsSearchingSimilar(false);
    }
  };

  const handleFeedbackSimilarCase = async (recId: string, feedbackValue: string) => {
    try {
      await apiClient.put(`/api/integrations/dms/similar-cases/${recId}/feedback`, {
        feedback: feedbackValue
      });
      setSimilarCases(prev => prev.map(c => {
        if (c.dms_document_id === recId || c.recommendation_id === recId) {
          return { ...c, doctor_feedback: feedbackValue };
        }
        return c;
      }));
      alert("Feedback recorded: " + feedbackValue.replace('_', ' '));
    } catch (e) {
      console.error("Feedback failed:", e);
      alert("Failed to submit feedback");
    }
  };

  useEffect(() => {
    if (id) {
      fetchVisitDetails();
    }
  }, [id]);

  const handleFinalizeVisit = async () => {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // First save the current data draft
      const payload = {
        symptoms,
        clinical_notes: clinicalNotes,
        diagnosis: selectedDiagnoses,
        treatment_plan: treatmentPlan
      };
      await apiClient.post(`/api/consultation/visit/${id}/save`, payload);
      
      // Then finalize/lock it
      const res = await apiClient.post(`/api/consultation/visit/${id}/finalize`);
      setVisit(res.data);
      setShowFinalizeModal(false);
      setSuccessMsg('Consultation has been finalized and locked.');
      navigate('/doctor/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to finalize consultation.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchVisitDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch visit details
      const visitRes = await apiClient.get(`/api/consultation/visit/${id}`);
      const visitData = visitRes.data;
      setVisit(visitData);
      setSymptoms(visitData.symptoms || '');
      setClinicalNotes(visitData.clinical_notes || '');
      setTreatmentPlan(visitData.treatment_plan || '');
      setSelectedDiagnoses(visitData.diagnosis || []);

      // 2. Fetch patient demographics
      const patientRes = await apiClient.get(`/api/patients/${visitData.patient_id}`);
      setPatient(patientRes.data);

      // Fetch DMS clinical integration data
      try {
        await fetchDmsClinicalData(visitData.patient_id);
      } catch (dmsErr) {
        console.error("DMS initialization failed:", dmsErr);
      }

      // 3. Fetch patient's recent vitals
      const vitalsRes = await apiClient.get(`/api/vitals/patient/${visitData.patient_id}`);
      if (vitalsRes.data.length > 0) {
        setCurrentVitals(vitalsRes.data[0]); // Most recent vitals
      }

      // 4. Fetch patient medical history
      const historyRes = await apiClient.get(`/api/patients/${visitData.patient_id}/medical-history`);
      setMedicalHistory(historyRes.data);

      // 4b. Fetch patient past consultation history
      try {
        const pastVisitsRes = await apiClient.get(`/api/consultations/patient/${visitData.patient_id}/history`);
        setPastVisits(pastVisitsRes.data.data || []);
      } catch (pastErr) {
        console.error("Failed to load past consultations:", pastErr);
      }

      // 5. Fetch existing lab orders for this visit
      const labsRes = await apiClient.get('/api/labs/orders', { params: { visit_id: id } });
      setExistingLabOrders(labsRes.data);

      // 6. Fetch available lab tests
      const masterLabsRes = await apiClient.get('/api/config/lab-tests');
      setLabTests(masterLabsRes.data);

      // 7. Fetch existing prescriptions for this visit
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions', { params: { visit_id: id } });
      setExistingPrescriptions(prescRes.data);

      // 8. Fetch existing radiology orders
      const radRes = await apiClient.get('/api/radiology/orders');
      setRadiologyOrders(radRes.data.filter((o: any) => o.visit_id === id));

    } catch (err: any) {
      console.error(err);
      setError('Failed to load consultation records.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAmendDiagnosisSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmendDiagQuery(val);
    if (val.length < 2) {
      setAmendDiagSuggestions([]);
      return;
    }

    setIsSearchingAmendDiag(true);
    try {
      const res = await apiClient.get('/api/consultation/icd10', { params: { q: val } });
      setAmendDiagSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingAmendDiag(false);
    }
  };

  const handleAddAmendDiagnosis = (code: Icd15Code) => {
    const entry = `${code.code} - ${code.name}`;
    if (!amendDiagnosis.includes(entry)) {
      setAmendDiagnosis([...amendDiagnosis, entry]);
    }
    setAmendDiagQuery('');
    setAmendDiagSuggestions([]);
  };

  const handleRemoveAmendDiagnosis = (entry: string) => {
    setAmendDiagnosis(amendDiagnosis.filter(d => d !== entry));
  };

  const handleSubmitAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (amendReason.trim().length < 5) {
      alert("Please provide a reason of at least 5 characters for this amendment.");
      return;
    }
    setIsSubmittingAmendment(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        reason: amendReason,
        amended_symptoms: amendSymptoms || undefined,
        amended_clinical_notes: amendClinicalNotes || undefined,
        amended_diagnosis: amendDiagnosis.length > 0 ? amendDiagnosis : undefined,
        amended_treatment_plan: amendTreatmentPlan || undefined
      };
      const res = await apiClient.post(`/api/consultation/visit/${id}/amend`, payload);
      setVisit(res.data);
      setAmendReason('');
      setAmendSymptoms('');
      setAmendClinicalNotes('');
      setAmendTreatmentPlan('');
      setAmendDiagnosis([]);
      setShowAmendmentForm(false);
      setSuccessMsg('Amendment successfully added to the consultation record.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit amendment.');
    } finally {
      setIsSubmittingAmendment(false);
    }
  };

  const handleSaveVisit = async (isComplete = false) => {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      symptoms,
      clinical_notes: clinicalNotes,
      diagnosis: selectedDiagnoses,
      treatment_plan: treatmentPlan
    };

    const endpoint = isComplete ? `/api/consultation/visit/${id}/complete` : `/api/consultation/visit/${id}/save`;

    try {
      const res = await apiClient.post(endpoint, payload);
      setVisit(res.data);
      if (isComplete) {
        navigate('/doctor/dashboard');
      } else {
        setSuccessMsg('Consultation progress saved successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update consultation records.');
    } finally {
      setIsSaving(false);
    }
  };

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
      
      // Refresh list
      const labsRes = await apiClient.get('/api/labs/orders', { params: { visit_id: id } });
      setExistingLabOrders(labsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to order lab tests.');
    } finally {
      setIsOrderingLabs(false);
    }
  };

  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit || !radTestName) return;
    setIsOrderingRadiology(true);
    setError(null);
    try {
      const payload = {
        patient_id: visit.patient_id,
        visit_id: visit.id,
        modality: radModality,
        test_name: radTestName
      };
      const res = await apiClient.post('/api/radiology/orders', payload);
      setRadiologyOrders(prev => [...prev, res.data]);
      setRadTestName('');
      setSuccessMsg('Radiology order placed successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit radiology order.');
    } finally {
      setIsOrderingRadiology(false);
    }
  };

  const toggleLabOrderExpand = async (orderId: string, status: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);

    // If status allows results and we haven't loaded them, load them
    if (['result_entered', 'verified'].includes(status) && !labOrderResults[orderId]) {
      try {
        const res = await apiClient.get(`/api/labs/orders/${orderId}/results`);
        setLabOrderResults(prev => ({ ...prev, [orderId]: res.data }));
      } catch (err) {
        console.error('Failed to load lab results:', err);
      }
    }
  };

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
      
      // Refresh list
      const prescRes = await apiClient.get('/api/pharmacy/prescriptions', { params: { visit_id: id } });
      setExistingPrescriptions(prescRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit e-prescription.');
    } finally {
      setIsOrderingPrescription(false);
    }
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
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
      </div>
    );
  }

  if (!visit || !patient) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">Visit Record Not Found</h2>
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to OPD Queue
        </button>
        
        {visit.is_finalized ? (
          <span className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold shadow-sm">
            <CheckCircle className="h-4 w-4 mr-1.5 text-amber-600" /> Case Sheet Finalized & Locked
          </span>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSaveVisit(false)}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-1.5" /> Save Draft Progress
            </button>
            <button
              onClick={() => setShowFinalizeModal(true)}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> Finalize & Lock
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-teal-700">{successMsg}</p>
        </div>
      )}

      {visit.is_finalized && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg flex items-start space-x-3 shadow-sm border border-amber-100">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-950">Locked Clinical Record</p>
            <p className="text-amber-700 text-xs mt-0.5">This consultation case sheet is finalized and locked. Additional notes, diagnoses, prescriptions, and lab orders cannot be added or modified.</p>
          </div>
        </div>
      )}

      {/* Main Grid: Left side details drawer (vitals, history), Right side EMR editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Clinical Demographic Info & Vitals Ledger */}
        <div className="space-y-6">
          
          {/* Patient Profile Demographics Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl shadow-md border border-slate-800/80 p-5 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">OPD Medical Record</span>
              <h2 className="text-md font-bold truncate mt-1">{patient.first_name} {patient.last_name}</h2>
              <div className="flex justify-between text-[11px] text-slate-300 font-mono mt-1.5">
                <span>MRN: {patient.mrn}</span>
                <span>{calculateAge(patient.dob)} Yrs / {patient.gender}</span>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <Link to={`/reception/patients/${patient.id}`} className="text-teal-400 hover:text-teal-300 font-bold flex items-center">
                  View Full Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Patient Physiological Vitals Triage Card */}
          <div data-tour="consultation-vitals" className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Activity className="h-4 w-4 text-teal-600 mr-1.5" /> Recent Vitals Triage
              </h3>
            </div>
            
            {currentVitals ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                      <span className="font-bold text-slate-800 font-mono">{currentVitals.bp_sys}/{currentVitals.bp_dia} mmHg</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Thermometer className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Temperature</span>
                      <span className="font-bold text-slate-800 font-mono">{currentVitals.temperature} °F</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pulse Rate</span>
                    <span className="font-bold text-slate-800 font-mono">{currentVitals.pulse} bpm</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Oxygen SpO2</span>
                    <span className="font-bold text-slate-800 font-mono">{currentVitals.spo2} %</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Height</span>
                    <span className="font-bold text-slate-800 font-mono">{currentVitals.height} cm</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Weight</span>
                    <span className="font-bold text-slate-800 font-mono">{currentVitals.weight} kg</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">BMI</span>
                    <span className="font-bold text-teal-700 font-mono">{currentVitals.bmi}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400 uppercase">Triage Status:</span>
                  <span className={`px-2 py-0.5 rounded-full capitalize ${
                    currentVitals.triage_level === 'red' ? 'bg-red-50 text-red-700' :
                    currentVitals.triage_level === 'yellow' ? 'bg-amber-50 text-amber-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    {currentVitals.triage_level}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center text-slate-400 text-xs font-semibold">
                No vitals triaged for this patient today.
              </div>
            )}
          </div>

          {/* Pre-Existing Medical History Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinical Medical History</h3>
            </div>
            
            {medicalHistory ? (
              <div className="p-5 space-y-4 text-xs font-semibold text-slate-700 leading-relaxed">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Allergies</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {medicalHistory.allergies.length === 0 ? <span className="text-slate-500 font-medium">None</span> : 
                      medicalHistory.allergies.map(a => (
                        <span key={a} className="bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5 text-[10px] font-bold">{a}</span>
                      ))
                    }
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Chronic Conditions</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {medicalHistory.chronic_conditions.length === 0 ? <span className="text-slate-500 font-medium">None</span> : 
                      medicalHistory.chronic_conditions.map(c => (
                        <span key={c} className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5 text-[10px] font-bold">{c}</span>
                      ))
                    }
                  </div>
                </div>

                {medicalHistory.past_surgeries && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Past Surgeries</span>
                    <p className="text-slate-600 mt-1">{medicalHistory.past_surgeries}</p>
                  </div>
                )}

                {medicalHistory.family_history && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Family History</span>
                    <p className="text-slate-600 mt-1">{medicalHistory.family_history}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center text-slate-400 text-xs font-semibold">
                No medical history compiled yet.
              </div>
            )}
          </div>

          {/* Patient Past Visits & Chronic/Repetitive Disease Tracker */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden font-sans">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Activity className="h-4 w-4 text-teal-600 mr-1.5" /> Past Visits & Chronic Diseases
              </h3>
            </div>
            
            <div className="p-5 text-xs space-y-4">
              {/* Chronic / Repeating Condition Highlights */}
              {(() => {
                const recurringMap: Record<string, number> = {};
                pastVisits.forEach(v => {
                  if (v.diagnoses) {
                    v.diagnoses.forEach((diag: string) => {
                      recurringMap[diag] = (recurringMap[diag] || 0) + 1;
                    });
                  }
                });
                const chronicMatches = Object.entries(recurringMap).filter(([_, count]) => count > 1);
                
                if (chronicMatches.length === 0) return null;
                
                return (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block font-sans">
                      ⚠️ Recurring/Chronic Diagnosis Detected
                    </span>
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 space-y-1.5">
                      {chronicMatches.map(([disease, count]) => (
                        <p key={disease} className="text-rose-800 font-bold text-[11px] flex justify-between items-center">
                          <span>{disease}</span>
                          <span className="bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase">
                            Diagnosed {count}x
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Past Visits logs */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Past Visits History
                </span>
                
                {pastVisits.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] font-semibold">No past clinical visits recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar space-y-2.5">
                    {pastVisits.map((v) => (
                      <div key={v.id} className="pt-2 text-[11px] space-y-1">
                        <div className="flex justify-between items-center text-slate-500 font-bold font-mono">
                          <span>{new Date(v.visit_date).toLocaleDateString()}</span>
                          <span className="text-slate-400 capitalize">{v.status}</span>
                        </div>
                        {v.symptoms && (
                          <p className="text-slate-700 font-semibold">
                            <strong className="text-slate-400 font-bold mr-1">Complaints:</strong> {v.symptoms}
                          </p>
                        )}
                        {v.diagnoses && v.diagnoses.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <strong className="text-slate-400 font-bold mr-1">Diagnoses:</strong>
                            {v.diagnoses.map((d: string, idx: number) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                        {v.treatment_plan && (
                          <p className="text-slate-600 italic">
                            <strong className="text-slate-400 font-bold not-italic mr-1">Plan:</strong> {v.treatment_plan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DMS AI Clinical Summary & Document Timeline */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden font-sans">
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setDmsLeftTab('summary')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center cursor-pointer ${
                  dmsLeftTab === 'summary' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                AI Clinical Summary
              </button>
              <button
                onClick={() => setDmsLeftTab('timeline')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center cursor-pointer ${
                  dmsLeftTab === 'timeline' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Clinical Timeline
              </button>
            </div>
            
            <div className="p-5 text-xs">
              {dmsLeftTab === 'summary' ? (
                <div className="space-y-4">
                  {dmsSummary ? (
                    <>
                      <div className="leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                        {dmsSummary.clinical_summary || "No clinical records summarized yet."}
                      </div>
                      {dmsSummary.extracted_allergies?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Extracted Allergies</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dmsSummary.extracted_allergies.map((a: string) => (
                              <span key={a} className="bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5 text-[9px] font-bold">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {dmsSummary.chronic_conditions?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Extracted Chronic Conditions</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dmsSummary.chronic_conditions.map((c: string) => (
                              <span key={c} className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5 text-[9px] font-bold">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium italic pt-2 border-t border-slate-100">
                        Generated by AI from {dmsSummary.document_count || 0} integrated documents.
                      </p>
                    </>
                  ) : (
                    <div className="text-slate-400 text-center py-4 font-medium">No integrated AI clinical summary found.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {dmsTimeline.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 font-medium">No timeline records synced.</div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 ml-2">
                      {dmsTimeline.map((item, idx) => (
                        <div key={idx} className="relative">
                          {/* Dot */}
                          <div className="absolute -left-[21px] top-1.5 bg-teal-600 rounded-full h-2 w-2 border-2 border-white" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">{new Date(item.date).toLocaleDateString()}</span>
                            <span className="font-bold text-slate-800 mt-0.5">{item.title}</span>
                            <p className="text-slate-500 mt-1 font-medium">{item.details}</p>
                            <span className="text-[9px] font-bold text-teal-600 mt-0.5 uppercase">{item.source_system} ({item.record_type})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DMS Similar Cases Matcher */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden font-sans">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Sparkles className="h-4 w-4 text-teal-600 mr-1.5" /> AI Clinical Similarity Matcher
              </h3>
            </div>
            
            <div className="p-5 text-xs space-y-4">
              <p className="text-[10px] text-slate-500 leading-normal">
                Search the hospital's clinical repository for similar cases to receive AI treatment recommendations.
              </p>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={similarSearchQuery}
                  onChange={(e) => setSimilarSearchQuery(e.target.value)}
                  placeholder="Query symptoms or diagnoses..."
                  className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSearchSimilarCases()}
                  disabled={isSearchingSimilar}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSearchingSimilar ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Search'}
                </button>
              </div>

              {similarCases.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 max-h-80 overflow-y-auto pr-1">
                  {similarCases.map((rec) => (
                    <div key={rec.recommendation_id} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 font-mono">Match: {(rec.score * 100).toFixed(0)}%</span>
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md font-bold text-[9px] uppercase">
                          Case {rec.recommendation_id.slice(-4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Diagnoses</span>
                        <p className="font-bold text-slate-700 mt-0.5">{rec.diagnosis || 'Unspecified'}</p>
                      </div>
                      {rec.notes && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Treatment / Notes</span>
                          <p className="text-slate-500 mt-0.5 italic">{rec.notes}</p>
                        </div>
                      )}
                      
                      {/* Feedback buttons */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Feedback:</span>
                        {rec.doctor_feedback ? (
                          <span className="text-[10px] font-bold text-teal-700 uppercase">
                            Logged: {rec.doctor_feedback.replace('_', ' ')}
                          </span>
                        ) : (
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => handleFeedbackSimilarCase(rec.recommendation_id, 'useful')}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 rounded font-bold text-[9px] cursor-pointer"
                            >
                              Useful
                            </button>
                            <button
                              onClick={() => handleFeedbackSimilarCase(rec.recommendation_id, 'not_useful')}
                              className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-700 rounded font-bold text-[9px] cursor-pointer"
                            >
                              Not Useful
                            </button>
                            <button
                              onClick={() => handleFeedbackSimilarCase(rec.recommendation_id, 'same_issue')}
                              className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-700 rounded font-bold text-[9px] cursor-pointer"
                            >
                              Same Issue
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ✨ AI Clinical Copilot & Patient Translator Card */}
          <div data-tour="consultation-ai-copilot" className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden font-sans bg-gradient-to-br from-teal-50/10 to-white">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Sparkles className="h-4 w-4 text-teal-600 mr-1.5 animate-pulse" /> AI Clinical Copilot
              </h3>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md font-bold text-[9px] uppercase tracking-wider">
                Gemini AI
              </span>
            </div>
            
            <div className="p-5 text-xs space-y-4">
              {/* Visit Layperson Summary Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Patient Lay Summary</span>
                  <button
                    onClick={handleGenerateAISummary}
                    disabled={isSummarizingAI || visit?.is_finalized}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-[10px] font-bold shadow-sm flex items-center cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSummarizingAI ? (
                      <>
                        <Loader2 className="animate-spin h-3 w-3 mr-1" /> Summarizing...
                      </>
                    ) : (
                      'Generate Summary'
                    )}
                  </button>
                </div>
                
                {aiCopilotSummary ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">{aiCopilotSummary}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiCopilotSummary);
                          setSuccessMsg('Summary copied to clipboard.');
                        }}
                        className="text-[9px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-medium">Click generate to translate complex complaints and clinical notes into a patient-friendly summary.</p>
                )}
              </div>

              <div className="border-t border-slate-100 my-3" />

              {/* Patient Instructions Simplification & Translation */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">Instructions Translator</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Simplify drug frequency and follow-up care guidelines to be jargon-free and translated.
                </p>

                <div className="flex space-x-2">
                  <select
                    value={aiTargetLanguage}
                    onChange={(e) => setAiTargetLanguage(e.target.value)}
                    disabled={visit?.is_finalized}
                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Spanish">Spanish (Español)</option>
                  </select>

                  <button
                    onClick={handleSimplifyInstructions}
                    disabled={isSimplifyingAI || visit?.is_finalized}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSimplifyingAI ? (
                      <>
                        <Loader2 className="animate-spin h-3 w-3 mr-1" /> Simplifying...
                      </>
                    ) : (
                      'Simplify & Translate'
                    )}
                  </button>
                </div>

                {aiCopilotInstructions ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Translated Output ({aiTargetLanguage}):</span>
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">{aiCopilotInstructions}</p>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <button
                        onClick={handleAppendInstructions}
                        disabled={visit?.is_finalized}
                        className="text-[9px] font-bold text-teal-700 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Append to Case Treatment Plan
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiCopilotInstructions);
                          setSuccessMsg('Instructions copied to clipboard.');
                        }}
                        className="text-[9px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-medium">Add instructions to the treatment plan and click translate to obtain localized, clear copy for the patient's care sheet.</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Columns: EMR Clinical notes, Diagnoses, treatment plan entry workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 space-y-6">
            
            {/* Symptoms / Presenting Complaints */}
            <div data-tour="consultation-notes">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Symptoms / Chief Complaints *</label>
              <textarea
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                disabled={visit.is_finalized}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Describe patient presenting complaints (e.g. Cough, high fever since 3 days)..."
              />
            </div>

            {/* Clinical Examination Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Clinical Notes / Examination Findings</label>
              <textarea
                rows={4}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                disabled={visit.is_finalized}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Document general physical checks, systemic examinations, or auscultation details..."
              />
            </div>

            {/* Autocomplete Diagnosis ICD-10 Search */}
            <div data-tour="consultation-icd10" className="relative">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">ICD-10 Diagnostic Classification</label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search disease/diagnosis by Name or ICD-10 code..."
                  value={diagQuery}
                  onChange={handleDiagnosisSearch}
                  disabled={visit.is_finalized}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 disabled:opacity-50"
                />
              </div>

              {isSearchingDiag && (
                <div className="absolute right-3 top-10">
                  <Loader2 className="animate-spin h-5 w-5 text-teal-600" />
                </div>
              )}

              {/* Autocomplete suggestions dropdown */}
              {diagSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 text-xs">
                  {diagSuggestions.map(code => (
                    <button
                      key={code.code}
                      type="button"
                      onClick={() => handleAddDiagnosis(code)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold"
                    >
                      <span>{code.name}</span>
                      <span className="text-teal-700 font-mono font-bold ml-4">{code.code}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected diagnoses list */}
              {selectedDiagnoses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDiagnoses.map(diag => (
                    <span 
                      key={diag} 
                      className="inline-flex items-center px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-full font-bold"
                    >
                      {diag}
                      {!visit.is_finalized && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDiagnosis(diag)}
                          className="ml-2 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Treatment Plan / Prescription text */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Treatment Plan & Prescription Instructions</label>
              <textarea
                rows={4}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                disabled={visit.is_finalized}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Prescribe medicines, dosage rules (e.g. Paracetamol 650mg TDS before food), lab tests, or follow-up timelines..."
              />
            </div>

            {/* Laboratory Diagnostics Section (Phase 8) */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center">
                  <FlaskConical className="h-4.5 w-4.5 text-teal-600 mr-2" /> Laboratory Diagnostics
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Search and order lab tests, or view completed metrics and scans.</p>
              </div>
              {/* Order new labs panel */}
              {!visit.is_finalized && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order New Laboratory Tests</span>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search test names (e.g. CBC, Lipid Profile)..."
                      value={searchLabQuery}
                      onChange={(e) => setSearchLabQuery(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    />
                    
                    {searchLabQuery.trim().length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 text-xs">
                        {labTests
                          .filter(t => t.test_name.toLowerCase().includes(searchLabQuery.toLowerCase()) || t.test_code.toLowerCase().includes(searchLabQuery.toLowerCase()))
                          .map(test => (
                            <button
                              key={test.id}
                              type="button"
                              onClick={() => handleSelectLabTest(test)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold"
                            >
                              <span>{test.test_name}</span>
                              <span className="text-slate-555 font-mono text-[10px] font-bold">₹{test.price}</span>
                            </button>
                          ))
                        }
                        {labTests.filter(t => t.test_name.toLowerCase().includes(searchLabQuery.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-slate-400 text-center font-medium">No matching tests found.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected lab tests display */}
                  {selectedLabTests.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLabTests.map(test => (
                          <span
                            key={test.id}
                            className="inline-flex items-center px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] rounded font-bold"
                          >
                            {test.test_name}
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedLabTest(test.id)}
                              className="ml-2 text-teal-600 hover:text-teal-800 font-bold cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                        <span className="text-xs font-bold text-slate-700">
                          Total Estimate: ₹{selectedLabTests.reduce((sum, t) => sum + t.price, 0)}
                        </span>
                        <button
                          type="button"
                          onClick={handleOrderLabs}
                          disabled={isOrderingLabs}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold shadow disabled:opacity-50 flex items-center cursor-pointer"
                        >
                          {isOrderingLabs ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 mr-1" />
                          )}
                          Place Lab Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Existing lab orders list */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lab Order Requests for this Visit</span>
                
                {existingLabOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic">No lab tests ordered yet for this visit.</p>
                ) : (
                  <div className="space-y-3.5">
                    {existingLabOrders.map(order => {
                      const isExpanded = expandedOrderId === order.id;
                      const resultsObj = labOrderResults[order.id];
                      return (
                        <div key={order.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                          {/* Order header row */}
                          <button
                            type="button"
                            onClick={() => toggleLabOrderExpand(order.id, order.status)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left cursor-pointer transition-all"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 font-sans">
                                Order: {order.items.map(i => i.test_name).join(', ')}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                Placed: {new Date(order.created_at).toLocaleDateString()} by {order.doctor_name}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              order.status === 'result_entered' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              order.status === 'sample_collected' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </button>

                          {/* Collapsible Results Area */}
                          {isExpanded && (
                            <div className="p-4 space-y-4 text-xs font-sans">
                              {['ordered', 'sample_collected'].includes(order.status) && (
                                <div className="text-center py-4 text-slate-400 font-semibold italic">
                                  {order.status === 'ordered' 
                                    ? 'Sample collection pending at the laboratory.' 
                                    : 'Sample collected. Diagnostic analysis in progress.'}
                                </div>
                              )}

                              {resultsObj && (
                                <div className="space-y-4">
                                  {resultsObj.results && resultsObj.results.length > 0 && (
                                    <table className="w-full border-collapse text-left">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                          <th className="py-2">Test Name</th>
                                          <th className="py-2">Value</th>
                                          <th className="py-2">Normal Range</th>
                                          <th className="py-2">Unit</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {resultsObj.results.map(res => (
                                          <tr key={res.test_id} className="border-b border-slate-100">
                                            <td className="py-2 font-bold text-slate-700">{res.test_name}</td>
                                            <td className={`py-2 font-mono font-bold ${res.abnormal_flag ? 'text-red-600 bg-red-50/50 px-1.5 rounded' : 'text-slate-800'}`}>
                                              {res.result_value} {res.abnormal_flag && '(ABNORMAL)'}
                                            </td>
                                            <td className="py-2 text-slate-500 font-mono font-semibold">{res.normal_range}</td>
                                            <td className="py-2 text-slate-500 font-semibold">{res.unit || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}

                                  {resultsObj.pdf_url && (
                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2.5">
                                      <span className="font-bold text-slate-700">Lab Diagnostic PDF Report</span>
                                      <a
                                        href={`${apiClient.defaults.baseURL || ''}${resultsObj.pdf_url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold shadow flex items-center cursor-pointer"
                                      >
                                        Download Scan File
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Radiology Diagnostic Imaging (Phase 26) */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center font-sans">
                  <FlaskConical className="h-4.5 w-4.5 text-teal-600 mr-2" /> Radiology & Imaging Orders
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Submit orders for X-Ray, MRI, CT, or Ultrasound scans.</p>
              </div>
              
              {/* Order new radiology panel */}
              {!visit.is_finalized && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans font-semibold">Place New Imaging Order</span>
                  
                  <form onSubmit={handleOrderRadiology} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs font-sans">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1 font-sans">Modality</label>
                      <select
                        value={radModality}
                        onChange={(e) => setRadModality(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold"
                      >
                        <option value="XRAY">X-Ray (XRAY)</option>
                        <option value="MRI">MRI Scan (MRI)</option>
                        <option value="CT">CT Scan (CT)</option>
                        <option value="US">Ultrasound (US)</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wide mb-1 font-sans">Scan Name / Description</label>
                        <input
                          type="text"
                          required
                          value={radTestName}
                          onChange={(e) => setRadTestName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
                          placeholder="e.g. Chest X-Ray PA View, Brain MRI"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isOrderingRadiology || !radTestName}
                        className="px-4 py-1.5 bg-teal-650 hover:bg-teal-700 bg-teal-650 text-white rounded text-[10px] font-bold shadow disabled:opacity-50 flex items-center cursor-pointer transition-all h-fit"
                      >
                        {isOrderingRadiology ? (
                          <Loader2 className="animate-spin h-3.5 w-3.5" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Order
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Existing radiology orders list */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block font-sans">Imaging Orders history for this Visit</span>
                
                {radiologyOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic font-sans">No radiology orders placed yet for this visit.</p>
                ) : (
                  <div className="space-y-3 font-sans text-xs">
                    {radiologyOrders.map(order => (
                      <div key={order.id} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{order.test_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Modality: {order.modality} | Placed: {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'reported' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                          order.status === 'performed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* E-Prescription Builder Section (Phase 9 & 10) */}
              <div data-tour="consultation-prescription" className="border-t border-slate-100 pt-6 space-y-6 font-sans">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center">
                    <Pill className="h-4.5 w-4.5 text-teal-600 mr-2" /> E-Prescription Builder
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Search drugs from central inventory and prescribe active warehouse stocks.</p>
                </div>
                
                {/* Create Prescription Panel */}
                {!visit.is_finalized && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Add Medication details</span>
                    
                    {/* Item fields layout */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-sans">
                      <div className="col-span-2 md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dosage</label>
                        <input
                          type="text"
                          value={prescDosage}
                          onChange={(e) => setPrescDosage(e.target.value)}
                          className="mt-1 block w-full bg-white border border-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. 1-0-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-sans">Frequency</label>
                        <select
                          value={prescFreq}
                          onChange={(e) => setPrescFreq(e.target.value)}
                          className="mt-1 block w-full bg-white border border-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold font-sans"
                        >
                          <option value="Daily">Daily</option>
                          <option value="OD">Once Daily (OD)</option>
                          <option value="BD">Twice Daily (BD)</option>
                          <option value="TDS">Thrice Daily (TDS)</option>
                          <option value="QID">Four Times Daily (QID)</option>
                          <option value="PRN">As Needed (PRN)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-sans">Duration</label>
                        <input
                          type="text"
                          value={prescDuration}
                          onChange={(e) => setPrescDuration(e.target.value)}
                          className="mt-1 block w-full bg-white border border-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. 5 days"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1 font-sans">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-sans">Quantity to Dispense</label>
                        <input
                          type="number"
                          min="1"
                          value={prescQty}
                          onChange={(e) => setPrescQty(parseInt(e.target.value) || 1)}
                          className="mt-1 block w-full bg-white border border-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-sans">Special Instructions</label>
                        <input
                          type="text"
                          value={prescInst}
                          onChange={(e) => setPrescInst(e.target.value)}
                          className="mt-1 block w-full bg-white border border-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. After food"
                        />
                      </div>
                    </div>

                    {/* Medication Autocomplete Search */}
                    <div className="relative pt-2 font-sans">
                      <Search className="absolute left-3 top-4.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search drugs inside inventory catalog by name or generic name..."
                        value={medicationSearchQuery}
                        onChange={handleMedicationSearch}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-sans"
                      />

                      {medicationSearchQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 text-xs">
                          {medicationsSuggestions.map(med => (
                            <button
                              key={med.id}
                              type="button"
                              onClick={() => handleAddMedication(med)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold cursor-pointer"
                            >
                              <div>
                                <span>{med.medicine_name}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">{med.generic_name}</span>
                              </div>
                              <span className={`text-[10px] font-bold ${med.available_stock > 0 ? 'text-teal-600' : 'text-red-500'}`}>
                                Stock: {med.available_stock} {med.unit_type}
                              </span>
                            </button>
                          ))}
                          {medicationsSuggestions.length === 0 && (
                            <div className="px-4 py-2 text-slate-400 text-center font-medium">No matching medications.</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected medications list */}
                    {selectedPrescriptionItems.length > 0 && (
                      <div className="space-y-3 border-t border-slate-200 pt-3">
                        <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                          <thead>
                            <tr className="text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
                              <th className="pb-1.5">Medicine</th>
                              <th className="pb-1.5">Dosage</th>
                              <th className="pb-1.5">Freq</th>
                              <th className="pb-1.5">Duration</th>
                              <th className="pb-1.5">Qty</th>
                              <th className="pb-1.5 text-right">Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrescriptionItems.map(item => (
                              <tr key={item.medicine_id} className="border-b border-slate-100 text-slate-600">
                                <td className="py-2 text-slate-800 font-bold">
                                  {item.medicine_name}
                                  <span className="text-[10px] text-slate-400 block font-normal font-sans">{item.instructions}</span>
                                </td>
                                <td className="py-2">{item.dosage}</td>
                                <td className="py-2">{item.frequency}</td>
                                <td className="py-2">{item.duration}</td>
                                <td className="py-2 font-mono font-bold text-slate-700">{item.quantity_prescribed}</td>
                                <td className="py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePrescriptionItem(item.medicine_id)}
                                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleCreatePrescription}
                            disabled={isOrderingPrescription}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold shadow disabled:opacity-50 flex items-center cursor-pointer"
                          >
                            {isOrderingPrescription ? (
                              <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 mr-1" />
                            )}
                            Save E-Prescription
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing prescriptions list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Prescriptions History</span>
                  
                  {existingPrescriptions.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic font-sans">No prescriptions recorded yet for this visit.</p>
                  ) : (
                    <div className="space-y-3 font-sans">
                      {existingPrescriptions.map(presc => (
                        <div key={presc.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 font-mono">Prescription: #{presc.id.substring(18)}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              presc.status === 'dispensed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              presc.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {presc.status}
                            </span>
                          </div>
                          
                          <table className="w-full text-left text-[11px] font-semibold text-slate-600 border-collapse">
                            <thead>
                              <tr className="text-slate-400 font-bold text-[9px] uppercase border-b border-slate-100">
                                <th className="pb-1">Medicine</th>
                                <th className="pb-1">Dosage/Freq</th>
                                <th className="pb-1 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {presc.items.map((item: any) => (
                                <tr key={item.medicine_id} className="border-b border-slate-50">
                                  <td className="py-1.5 font-bold text-slate-700">{item.medicine_name}</td>
                                  <td className="py-1.5">{item.dosage} / {item.frequency} ({item.duration})</td>
                                  <td className="py-1.5 text-right font-mono font-bold text-slate-800">{item.quantity_prescribed}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {visit.is_finalized && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 space-y-6 mt-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center">
                  <FileText className="h-5 w-5 text-teal-600 mr-2" /> EMR Amendments & Audit Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Clinical logs appended to the signed record.</p>
              </div>
              {!showAmendmentForm && (
                <button
                  type="button"
                  onClick={() => setShowAmendmentForm(true)}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Amendment
                </button>
              )}
            </div>

            {/* Amendment form */}
            {showAmendmentForm && (
              <form onSubmit={handleSubmitAmendment} className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Amendment Details</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAmendmentForm(false);
                      setAmendReason('');
                      setAmendSymptoms('');
                      setAmendClinicalNotes('');
                      setAmendTreatmentPlan('');
                      setAmendDiagnosis([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Reason for Amendment *</label>
                  <textarea
                    rows={2}
                    required
                    value={amendReason}
                    onChange={(e) => setAmendReason(e.target.value)}
                    className="mt-1.5 block w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Document clinical rationale for amending this locked record (e.g. Corrected patient medication allergy note)..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Amended Symptoms (Optional)</label>
                    <textarea
                      rows={2}
                      value={amendSymptoms}
                      onChange={(e) => setAmendSymptoms(e.target.value)}
                      className="mt-1.5 block w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Enter updated symptoms if applicable..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Amended Clinical Notes (Optional)</label>
                    <textarea
                      rows={2}
                      value={amendClinicalNotes}
                      onChange={(e) => setAmendClinicalNotes(e.target.value)}
                      className="mt-1.5 block w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Enter corrected physical/examination findings..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Amended Treatment Plan (Optional)</label>
                    <textarea
                      rows={2}
                      value={amendTreatmentPlan}
                      onChange={(e) => setAmendTreatmentPlan(e.target.value)}
                      className="mt-1.5 block w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Enter updated follow-up or dosage instruction plan..."
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Amended ICD-10 Classification (Optional)</label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search disease/diagnosis..."
                        value={amendDiagQuery}
                        onChange={handleAmendDiagnosisSearch}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                    {isSearchingAmendDiag && (
                      <div className="absolute right-3 top-8">
                        <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                      </div>
                    )}
                    {amendDiagSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 text-xs">
                        {amendDiagSuggestions.map(code => (
                          <button
                            key={code.code}
                            type="button"
                            onClick={() => handleAddAmendDiagnosis(code)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 flex justify-between font-semibold text-slate-800"
                          >
                            <span>{code.name}</span>
                            <span className="text-teal-700 font-mono font-bold ml-4">{code.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {amendDiagnosis.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {amendDiagnosis.map(diag => (
                          <span key={diag} className="inline-flex items-center px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] rounded font-bold">
                            {diag}
                            <button
                              type="button"
                              onClick={() => handleRemoveAmendDiagnosis(diag)}
                              className="ml-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAmendmentForm(false);
                      setAmendReason('');
                      setAmendSymptoms('');
                      setAmendClinicalNotes('');
                      setAmendTreatmentPlan('');
                      setAmendDiagnosis([]);
                    }}
                    className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAmendment}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer inline-flex items-center"
                  >
                    {isSubmittingAmendment ? (
                      <>
                        <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> Submitting...
                      </>
                    ) : 'Save Amendment'}
                  </button>
                </div>
              </form>
            )}

            {/* Timeline of existing amendments */}
            <div className="space-y-4">
              {!visit.amendments || visit.amendments.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold italic">No amendments recorded for this locked EMR record.</p>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                  {visit.amendments.map((amend, index) => (
                    <div key={amend.id || index} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 bg-teal-600 text-white rounded-full p-1 border-4 border-white flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-slate-800">
                        <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-1.5">
                          <div>
                            <span className="font-bold text-slate-800">{amend.amended_by_name}</span>
                            <span className="text-slate-400 font-medium ml-1">({amend.amended_by.substring(0, 8)})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(amend.amended_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 bg-white border border-slate-100 rounded-lg p-2.5 font-medium italic">
                          <strong className="text-slate-900 not-italic block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for amendment:</strong>
                          "{amend.reason}"
                        </div>

                        {/* Display what fields were amended */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1.5">
                          {amend.amended_symptoms && (
                            <div className="bg-white border border-slate-100 rounded p-2">
                              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Amended Symptoms</span>
                              <span className="text-slate-700 font-medium">{amend.amended_symptoms}</span>
                            </div>
                          )}
                          {amend.amended_clinical_notes && (
                            <div className="bg-white border border-slate-100 rounded p-2">
                              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Amended Clinical Notes</span>
                              <span className="text-slate-700 font-medium">{amend.amended_clinical_notes}</span>
                            </div>
                          )}
                          {amend.amended_treatment_plan && (
                            <div className="bg-white border border-slate-100 rounded p-2">
                              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Amended Treatment Plan</span>
                              <span className="text-slate-700 font-medium">{amend.amended_treatment_plan}</span>
                            </div>
                          )}
                          {amend.amended_diagnosis && amend.amended_diagnosis.length > 0 && (
                            <div className="bg-white border border-slate-100 rounded p-2">
                              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Amended Diagnosis (ICD-10)</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {amend.amended_diagnosis.map(d => (
                                  <span key={d} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] rounded font-bold">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFinalizeModal && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
          <div className="p-6 border-b border-slate-100 bg-amber-50 flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold text-amber-900">Finalize & Lock Consultation</h3>
              <p className="text-amber-700 text-xs mt-1">
                Once finalized, this EMR sheet will be signed and locked. You will not be able to change chief complaints, clinical notes, diagnoses, prescriptions, or ordered tests.
              </p>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 text-sm">
            <button
              type="button"
              onClick={() => setShowFinalizeModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleFinalizeVisit}
              disabled={isSaving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md transition-all cursor-pointer inline-flex items-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Processing...
                </>
              ) : 'Yes, Finalize & Lock'}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
export default Consultation;
