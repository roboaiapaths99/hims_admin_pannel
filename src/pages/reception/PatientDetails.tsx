import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  User, Calendar, Phone, Mail, FileText, Upload, Plus, Edit2, 
  ShieldAlert, Loader2, Save, ArrowLeft, Heart, Paperclip, ClipboardList, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  dob: string;
  gender: string;
  blood_group?: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url?: string;
  abha_number?: string;
  abha_address?: string;
  consent_signed: boolean;
}

interface MedicalHistory {
  allergies: string[];
  chronic_conditions: string[];
  past_surgeries?: string;
  family_history?: string;
}

interface PatientDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [patientLabs, setPatientLabs] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [patientInvoices, setPatientInvoices] = useState<any[]>([]);

  // UI / Loader states
  const [activeTab, setActiveTab] = useState<'timeline' | 'visits' | 'labs' | 'prescriptions' | 'billing' | 'documents' | 'insurance'>('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  interface PatientPolicy {
    id: string;
    patient_id: string;
    insurance_company: string;
    policy_number: string;
    card_number: string;
    valid_till: string;
    sum_insured: number;
  }

  const [policies, setPolicies] = useState<PatientPolicy[]>([]);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [insCompany, setInsCompany] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [validTill, setValidTill] = useState('');
  const [sumInsured, setSumInsured] = useState('');

  // Edit Patient fields (Modal/Inline)
  const [showEditModal, setShowEditModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);

  // History edit fields
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [pastSurgeries, setPastSurgeries] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');

  // Upload document fields
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Lab Report');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // ABHA flow states (for ABDM Integration phase)
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);
  const [abhaNumberInput, setAbhaNumberInput] = useState('');
  const [abhaOtpSent, setAbhaOtpSent] = useState(false);
  const [abhaOtp, setAbhaOtp] = useState('');
  const [isAbhaVerifying, setIsAbhaVerifying] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch details
      const patientRes = await apiClient.get(`/api/patients/${id}`);
      setPatient(patientRes.data);
      
      // Populate edit states
      setFirstName(patientRes.data.first_name);
      setLastName(patientRes.data.last_name);
      setPhone(patientRes.data.phone);
      setEmail(patientRes.data.email || '');
      setAddress(patientRes.data.address);
      setEmergencyName(patientRes.data.emergency_contact_name);
      setEmergencyPhone(patientRes.data.emergency_contact_phone);

      // 2. Fetch history
      const historyRes = await apiClient.get(`/api/patients/${id}/medical-history`);
      setMedicalHistory(historyRes.data);
      setAllergiesText(historyRes.data.allergies.join(', '));
      setConditionsText(historyRes.data.chronic_conditions.join(', '));
      setPastSurgeries(historyRes.data.past_surgeries || '');
      setFamilyHistory(historyRes.data.family_history || '');

      // 3. Fetch documents
      const docsRes = await apiClient.get(`/api/patients/${id}/documents`);
      setDocuments(docsRes.data);

      // 4. Fetch policies
      const policiesRes = await apiClient.get(`/api/tpa/policies/patient/${id}`);
      setPolicies(policiesRes.data);

      // 5. Fetch consultations / visits
      try {
        const visitsRes = await apiClient.get(`/api/consultation/patient/${id}/history`);
        setPatientVisits(visitsRes.data);
      } catch (e) {
        console.error("Failed to load visits:", e);
      }

      // 6. Fetch labs
      try {
        const labsRes = await apiClient.get('/api/labs/orders', { params: { patient_id: id } });
        setPatientLabs(labsRes.data);
      } catch (e) {
        console.error("Failed to load labs:", e);
      }

      // 7. Fetch prescriptions
      try {
        const prescRes = await apiClient.get('/api/pharmacy/prescriptions', { params: { patient_id: id } });
        setPatientPrescriptions(prescRes.data);
      } catch (e) {
        console.error("Failed to load prescriptions:", e);
      }

      // 8. Fetch invoices
      try {
        const invoicesRes = await apiClient.get('/api/billing/invoices', { params: { patient_id: id } });
        setPatientInvoices(invoicesRes.data);
      } catch (e) {
        console.error("Failed to load invoices:", e);
      }

      // 9. Fetch DMS integration data
      try {
        await fetchDmsDocs();
        await fetchDmsSyncStatus();
      } catch (e) {
        console.error("Failed to load DMS data:", e);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch patient records.');
    } finally {
      setIsLoading(false);
    }
  };

  // DMS Integration State
  const [dmsDocs, setDmsDocs] = useState<any[]>([]);
  const [dmsSyncStatus, setDmsSyncStatus] = useState<any>(null);
  const [dmsTab, setDmsTab] = useState<'local' | 'dms'>('dms');
  const [isSyncingDmsPatient, setIsSyncingDmsPatient] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // DMS Form inputs
  const [dmsDocType, setDmsDocType] = useState('Lab Report');
  const [dmsNotes, setDmsNotes] = useState('');
  const [dmsFile, setDmsFile] = useState<File | null>(null);
  const [isUploadingDms, setIsUploadingDms] = useState(false);

  const fetchDmsDocs = async () => {
    try {
      const res = await apiClient.get(`/api/integrations/dms/patients/${id}/documents`);
      setDmsDocs(res.data);
    } catch (e) {
      console.error("DMS docs fetch failed:", e);
    }
  };

  const fetchDmsSyncStatus = async () => {
    try {
      const res = await apiClient.get(`/api/integrations/dms/patients/${id}/sync-status`);
      setDmsSyncStatus(res.data);
    } catch (e) {
      console.error("DMS sync status fetch failed:", e);
    }
  };

  const handleSyncPatient = async () => {
    setIsSyncingDmsPatient(true);
    try {
      await apiClient.post(`/api/integrations/dms/patients/${id}/sync`);
      await fetchDmsSyncStatus();
    } catch (e) {
      console.error("Patient sync failed:", e);
    } finally {
      setIsSyncingDmsPatient(false);
    }
  };

  const handleDmsUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmsFile) return;
    setIsUploadingDms(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', id || '');
      formData.append('document_type', dmsDocType);
      formData.append('notes', dmsNotes);
      formData.append('file', dmsFile);

      await apiClient.post('/api/integrations/dms/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDmsNotes('');
      setDmsFile(null);
      const fileInput = document.getElementById('dms-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchDmsDocs();
    } catch (e: any) {
      alert(e.response?.data?.detail || "DMS upload failed");
    } finally {
      setIsUploadingDms(false);
    }
  };

  const handlePreviewDocument = async (docId: string) => {
    setPreviewDocId(docId);
    setPreviewLoading(true);
    try {
      const res = await apiClient.get(`/api/integrations/dms/documents/${docId}/preview-token`);
      const token = res.data.token;
      const previewEndpoint = `${apiClient.defaults.baseURL}/api/integrations/dms/documents/${docId}/preview?token=${token}`;
      setPreviewUrl(previewEndpoint);
    } catch (e) {
      console.error("Preview failed:", e);
      alert("Failed to load preview token");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReprocessDocument = async (docId: string) => {
    try {
      await apiClient.post(`/api/integrations/dms/documents/${docId}/reprocess`, {});
      alert("Document queued for reprocessing");
      await fetchDmsDocs();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to trigger reprocess");
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPatient(true);
    setError(null);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone
      };

      const res = await apiClient.put(`/api/patients/${id}`, payload);
      setPatient(res.data);
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update demographics.');
    } finally {
      setIsUpdatingPatient(false);
    }
  };

  const handleSaveMedicalHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHistory(true);
    setError(null);
    try {
      const allergiesArray = allergiesText.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const conditionsArray = conditionsText.split(',').map(s => s.trim()).filter(s => s.length > 0);

      const payload = {
        allergies: allergiesArray,
        chronic_conditions: conditionsArray,
        past_surgeries: pastSurgeries || undefined,
        family_history: familyHistory || undefined
      };

      const res = await apiClient.post(`/api/patients/${id}/medical-history`, payload);
      setMedicalHistory(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save medical history.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploadingDoc(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('document_name', docName);
      formData.append('document_type', docType);
      formData.append('file', selectedFile);

      const res = await apiClient.post(`/api/patients/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDocuments([...documents, res.data]);
      setDocName('');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insCompany || !policyNum || !cardNum || !validTill || !sumInsured) return;
    setIsSavingPolicy(true);
    setError(null);
    try {
      const payload = {
        patient_id: id,
        insurance_company: insCompany,
        policy_number: policyNum,
        card_number: cardNum,
        valid_till: new Date(validTill).toISOString(),
        sum_insured: parseFloat(sumInsured)
      };
      const res = await apiClient.post('/api/tpa/policies', payload);
      setPolicies([...policies, res.data]);
      setInsCompany('');
      setPolicyNum('');
      setCardNum('');
      setValidTill('');
      setSumInsured('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register policy card.');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // ABHA flow handlers
  const handleRequestAbhaOtp = async () => {
    if (!abhaNumberInput) return;
    setIsAbhaVerifying(true);
    setError(null);
    try {
      await apiClient.post('/api/abdm/verify-abha', { abha_number: abhaNumberInput });
      setAbhaOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate OTP check.');
    } finally {
      setIsAbhaVerifying(false);
    }
  };

  const handleLinkAbha = async () => {
    if (!abhaOtp) return;
    setIsAbhaVerifying(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/abdm/link-abha', {
        patient_id: id,
        abha_number: abhaNumberInput,
        otp: abhaOtp
      });
      // Link success, refresh patient details
      setPatient(prev => prev ? { ...prev, abha_number: abhaNumberInput } : null);
      setIsAbhaModalOpen(false);
      setAbhaOtpSent(false);
      setAbhaOtp('');
      setAbhaNumberInput('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to link ABHA profile.');
    } finally {
      setIsAbhaVerifying(false);
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

  if (!patient) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">Patient Profile Not Found</h2>
        <button
          onClick={() => navigate('/reception/patients')}
          className="inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Navigation Action row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/reception/patients')}
          className="inline-flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Patient Database
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Edit Demographics
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Main Grid: Left Column Clinical Card, Right Column Tabs Content Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Demographics Identity Panel */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="p-6 bg-slate-900 text-white space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-14 w-14 rounded-full bg-teal-500 flex items-center justify-center font-bold text-white text-xl uppercase shadow-md">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold truncate">{patient.first_name} {patient.last_name}</h2>
                <span className="text-xs font-bold text-teal-300 font-mono tracking-wider">{patient.mrn}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2 text-slate-300 text-xs">
              <div className="flex items-center"><User className="h-4 w-4 mr-2 text-teal-400" /> {calculateAge(patient.dob)} Years / {patient.gender}</div>
              <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-teal-400" /> DOB: {new Date(patient.dob).toLocaleDateString()}</div>
              <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-teal-400" /> <span className="font-mono">{patient.phone}</span></div>
              {patient.email && <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-teal-400" /> {patient.email}</div>}
              {patient.blood_group && <div className="flex items-center"><Heart className="h-4 w-4 mr-2 text-teal-400" /> Blood Group: <span className="font-bold text-teal-300">{patient.blood_group}</span></div>}
            </div>
          </div>

          <div className="p-6 space-y-4 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Residential Address</span>
              <p className="text-sm text-slate-700 mt-1 font-semibold leading-relaxed">{patient.address}</p>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Emergency Contact</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{patient.emergency_contact_name}</p>
              <p className="text-xs font-mono font-medium text-slate-600 mt-0.5">{patient.emergency_contact_phone}</p>
            </div>

            {/* ABHA card status */}
            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">ABHA Gateway Integration</span>
              {patient.abha_number ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center text-xs font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-600 mr-1.5" /> Identity Linked</div>
                  <p className="text-xs font-mono">ID: {patient.abha_number}</p>
                  {patient.abha_address && <p className="text-[10px] font-mono text-emerald-700">{patient.abha_address}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">No Ayushman Bharat ID linked to this medical record.</p>
                  <button
                    onClick={() => setIsAbhaModalOpen(true)}
                    className="w-full text-center py-2 bg-teal-550 hover:bg-teal-600 bg-teal-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                  >
                    Link ABHA / Verify OTP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Workspaces tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Navigation header */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-1.5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'timeline'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> History
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'visits'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Consultations ({patientVisits.length})
            </button>
            <button
              onClick={() => setActiveTab('labs')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'labs'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Labs ({patientLabs.length})
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'prescriptions'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Rx ({patientPrescriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'billing'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Billing ({patientInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'documents'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1" /> Files ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'insurance'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" /> TPA ({policies.length})
            </button>
          </div>

          {/* Timeline / History Tab Content workspace */}
          {activeTab === 'timeline' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-6">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <h3 className="text-md font-bold text-slate-800">Pre-Existing Clinical Profile & Vitals History</h3>
              </div>

              <form onSubmit={handleSaveMedicalHistory} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Allergies (comma separated)</label>
                    <input
                      type="text"
                      value={allergiesText}
                      onChange={(e) => setAllergiesText(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. Penicillin, Peanuts, Pollen"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chronic Conditions (comma separated)</label>
                    <input
                      type="text"
                      value={conditionsText}
                      onChange={(e) => setConditionsText(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. Diabetes, Hypertension, Asthma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Past Surgeries / Operations</label>
                    <textarea
                      rows={3}
                      value={pastSurgeries}
                      onChange={(e) => setPastSurgeries(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Specify date and name of past surgeries if any..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Relevant Family Medical History</label>
                    <textarea
                      rows={3}
                      value={familyHistory}
                      onChange={(e) => setFamilyHistory(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Specify occurrences of hereditary conditions (cardiac, renal)..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingHistory}
                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSavingHistory ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" /> Save History Records
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Consultations Workspace */}
          {activeTab === 'visits' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Consultations History</h3>
              <div className="space-y-4">
                {patientVisits.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 font-medium">No consultations documented for this patient.</p>
                ) : (
                  patientVisits.map((v) => (
                    <div key={v.id} className="p-4 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all text-xs">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-700">Date: {new Date(v.visit_date).toLocaleDateString()}</span>
                          {v.doctor_name && <span className="text-slate-500 ml-3">Consultant: Dr. {v.doctor_name}</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          v.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-bold text-slate-500 tracking-wider uppercase text-[9px] block">Chief Symptoms</span>
                          <p className="font-semibold text-slate-800 mt-0.5 leading-relaxed">{v.symptoms || 'None recorded'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 tracking-wider uppercase text-[9px] block">Diagnosis Codes</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {v.diagnosis && v.diagnosis.length > 0 ? (
                              v.diagnosis.map((d: string) => (
                                <span key={d} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">{d}</span>
                              ))
                            ) : (
                              <span className="text-slate-400">No diagnosis recorded</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-500 tracking-wider uppercase text-[9px] block">Clinical Notes</span>
                          <p className="text-slate-700 font-medium mt-0.5 whitespace-pre-line leading-relaxed">{v.clinical_notes || 'None recorded'}</p>
                        </div>
                        <div className="mt-2">
                          <span className="font-bold text-slate-500 tracking-wider uppercase text-[9px] block">Treatment Plan / Rx</span>
                          <p className="text-slate-700 font-medium mt-0.5 whitespace-pre-line leading-relaxed">{v.treatment_plan || 'None recorded'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Labs Workspace */}
          {activeTab === 'labs' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Lab Orders</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3 text-left">Date Ordered</th>
                    <th className="px-6 py-3 text-left">Order Reference</th>
                    <th className="px-6 py-3 text-left">Requested Tests</th>
                    <th className="px-6 py-3 text-left">Doctor</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {patientLabs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">No lab orders logged for this patient.</td>
                    </tr>
                  ) : (
                    patientLabs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono text-slate-500">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3 font-mono font-bold text-teal-700">#{l.id.substring(18)}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {l.items.map((i: any) => (
                              <span key={i.test_name} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">{i.test_name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-600">{l.doctor_name}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            l.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                            l.status === 'ordered' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Prescriptions Workspace */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient E-Prescriptions Ledger</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {patientPrescriptions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8 font-medium">No prescriptions documented for this patient.</p>
                ) : (
                  patientPrescriptions.map((pr) => (
                    <div key={pr.id} className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span>Date: {new Date(pr.created_at).toLocaleDateString()}</span>
                        <span>Doc: Dr. {pr.doctor_name}</span>
                      </div>
                      <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                        <thead>
                          <tr className="text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
                            <th className="pb-1">Medicine Name</th>
                            <th className="pb-1">Dosage</th>
                            <th className="pb-1">Frequency</th>
                            <th className="pb-1 text-right">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pr.items.map((i: any) => (
                            <tr key={i.medicine_name} className="border-b border-slate-100 text-slate-600">
                              <td className="py-1.5 font-bold text-slate-800">{i.medicine_name}</td>
                              <td className="py-1.5">{i.dosage}</td>
                              <td className="py-1.5">{i.frequency}</td>
                              <td className="py-1.5 text-right font-mono font-bold">{i.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Billing Workspace */}
          {activeTab === 'billing' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Invoices Ledger</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3 text-left">Date Raised</th>
                    <th className="px-6 py-3 text-left">Invoice No</th>
                    <th className="px-6 py-3 text-left">Total Value</th>
                    <th className="px-6 py-3 text-left">Payment Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {patientInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">No invoices registered for this patient.</td>
                    </tr>
                  ) : (
                    patientInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3 font-mono font-bold text-teal-700">{inv.invoice_number}</td>
                        <td className="px-6 py-3 font-bold text-slate-800">₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            inv.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            inv.payment_status === 'due' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => navigate(`/billing/invoice/view/${inv.id}`)}
                            className="text-teal-600 hover:text-teal-800 font-bold inline-flex items-center bg-transparent border-0 cursor-pointer"
                          >
                            Open Bill
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Uploaded Documents Workspace */}
          {activeTab === 'documents' && (
            <div className="space-y-6 font-sans">
              {/* DMS Sync Status Banner */}
              {dmsSyncStatus && (
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                  dmsSyncStatus.status === 'synced'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : dmsSyncStatus.status === 'failed'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white/80 shadow-xs">
                      <Heart className={`h-5 w-5 ${dmsSyncStatus.status === 'synced' ? 'text-emerald-600' : dmsSyncStatus.status === 'failed' ? 'text-rose-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">DMS Patient Integration Status</h4>
                      <p className="text-xs mt-0.5 font-medium opacity-90">
                        {dmsSyncStatus.status === 'synced'
                          ? `Synced successfully. DMS ID: ${dmsSyncStatus.dms_patient_id}`
                          : dmsSyncStatus.status === 'failed'
                          ? `Sync Failed: ${dmsSyncStatus.last_error || 'Unknown error'}`
                          : 'Patient demographics not synced to Document Intelligence yet.'}
                      </p>
                    </div>
                  </div>
                  {dmsSyncStatus.status !== 'synced' && (
                    <button
                      type="button"
                      onClick={handleSyncPatient}
                      disabled={isSyncingDmsPatient}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSyncingDmsPatient ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : null}
                      Sync Demographics
                    </button>
                  )}
                </div>
              )}

              {/* Sub-tab selection */}
              <div className="flex space-x-2 border-b border-slate-200 pb-px">
                <button
                  type="button"
                  onClick={() => setDmsTab('dms')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    dmsTab === 'dms'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  DMS Document Intelligence
                </button>
                <button
                  type="button"
                  onClick={() => setDmsTab('local')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    dmsTab === 'local'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  HIMS Local Attachments
                </button>
              </div>

              {dmsTab === 'local' ? (
                <>
                  {/* Local Upload Panel */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Upload Local Attachment (PDF / Images)</h3>
                    <form onSubmit={handleFileUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Title</label>
                        <input
                          type="text"
                          required
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. Chest X-Ray Report"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="Lab Report">Lab Report</option>
                          <option value="Prescription">Old Prescription</option>
                          <option value="ID Proof">Government ID Proof</option>
                          <option value="Other">Other Clinical Note</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="file"
                          required
                          id="doc-file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="doc-file"
                          className="flex items-center justify-center border border-dashed border-slate-300 hover:bg-slate-50 rounded-lg py-2.5 px-4 cursor-pointer text-xs font-bold text-slate-600"
                        >
                          <Upload className="h-4 w-4 mr-2" /> {selectedFile ? selectedFile.name.slice(0, 15) + '...' : 'Choose File'}
                        </label>
                      </div>
                      <div className="md:col-span-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isUploadingDoc || !selectedFile || !docName}
                          className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingDoc ? <Loader2 className="animate-spin h-4.5 w-4.5 mr-1" /> : <Plus className="h-4 w-4 mr-1.5" />}
                          Upload Attachment File
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Local List grid */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Attached Medical Documents Ledger</h4>
                    </div>
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Document Name</th>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category Type</th>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Date</th>
                          <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200 text-xs">
                        {documents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                              No documents uploaded. Keep patient clinical logs like previous prescriptions and scans here.
                            </td>
                          </tr>
                        ) : (
                          documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-semibold text-slate-800 flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-teal-600" /> {doc.document_name}
                              </td>
                              <td className="px-6 py-3 text-slate-600 font-medium">{doc.document_type}</td>
                              <td className="px-6 py-3 text-slate-500 font-mono">{new Date(doc.uploaded_at).toLocaleString()}</td>
                              <td className="px-6 py-3 text-right">
                                <a
                                  href={`${apiClient.defaults.baseURL}${doc.file_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-teal-600 hover:text-teal-800 font-bold inline-flex items-center"
                                >
                                  Download/View File
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {/* DMS Upload Panel */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Upload File to DMS (AI Extraction & OCR)</h3>
                    <form onSubmit={handleDmsUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinical Notes / Notes</label>
                        <input
                          type="text"
                          value={dmsNotes}
                          onChange={(e) => setDmsNotes(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. Patient consultation transcript / scan context"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                        <select
                          value={dmsDocType}
                          onChange={(e) => setDmsDocType(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="Prescription">Prescription</option>
                          <option value="Lab Report">Lab Report</option>
                          <option value="Discharge Summary">Discharge Summary</option>
                          <option value="Referral Letter">Referral Letter</option>
                          <option value="Radiology Report">Radiology Report</option>
                          <option value="Other">Other Clinical Scan</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="file"
                          required
                          id="dms-file"
                          onChange={(e) => setDmsFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="dms-file"
                          className="flex items-center justify-center border border-dashed border-slate-300 hover:bg-slate-50 rounded-lg py-2.5 px-4 cursor-pointer text-xs font-bold text-slate-600"
                        >
                          <Upload className="h-4 w-4 mr-2" /> {dmsFile ? dmsFile.name.slice(0, 15) + '...' : 'Choose File'}
                        </label>
                      </div>
                      <div className="md:col-span-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isUploadingDms || !dmsFile}
                          className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingDms ? <Loader2 className="animate-spin h-4.5 w-4.5 mr-1" /> : <Plus className="h-4 w-4 mr-1.5" />}
                          Submit to Document Intelligence
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* DMS Documents List grid */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">DMS Clinical Extraction Ledger</h4>
                      <button
                        type="button"
                        onClick={fetchDmsDocs}
                        className="p-1 text-slate-500 hover:text-teal-600 cursor-pointer border-0 bg-transparent"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">File Name</th>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Doc Type</th>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">AI Clinical Summary</th>
                          <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 tracking-wider">Status</th>
                          <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200 text-xs">
                        {dmsDocs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                              No documents uploaded to DMS yet. Sync patient and upload files to trigger OCR & clinical extraction.
                            </td>
                          </tr>
                        ) : (
                          dmsDocs.map((doc) => (
                            <tr key={doc.dms_document_id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-semibold text-slate-800">
                                <div className="flex flex-col">
                                  <span className="flex items-center text-slate-800">
                                    <FileText className="h-4 w-4 mr-2 text-teal-600" /> {doc.original_filename}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 ml-6">{doc.dms_document_id}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-slate-600 font-medium">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                                  {doc.document_type}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-slate-500 italic max-w-xs truncate">
                                {doc.summary_snippet || "Processing details..."}
                              </td>
                              <td className="px-6 py-3 text-slate-600">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                  doc.status === 'verified'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : doc.status === 'processing'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : doc.status === 'pending_verification'
                                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {doc.status === 'pending_verification' ? 'Needs Review' : doc.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewDocument(doc.dms_document_id)}
                                  className="text-teal-600 hover:text-teal-800 font-bold bg-transparent border-0 cursor-pointer text-xs"
                                >
                                  View Preview
                                </button>
                                {doc.status === 'failed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleReprocessDocument(doc.dms_document_id)}
                                    className="text-rose-600 hover:text-rose-800 font-bold bg-transparent border-0 cursor-pointer text-xs"
                                  >
                                    Retry
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Secure Preview Modal */}
              {previewUrl && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200">
                    <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold tracking-wide uppercase">Secure DMS Document Viewer</h3>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">Document ID: {previewDocId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPreviewUrl(null); setPreviewDocId(null); }}
                        className="text-white hover:text-rose-400 font-extrabold cursor-pointer border-0 bg-transparent text-lg"
                      >
                        &times; Close Viewer
                      </button>
                    </div>
                    <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 relative">
                      {previewLoading ? (
                        <div className="flex flex-col items-center justify-center text-slate-500 font-bold">
                          <Loader2 className="animate-spin h-8 w-8 text-teal-600 mb-2" />
                          Acquiring Secure Preview Token...
                        </div>
                      ) : (
                        <iframe
                          src={previewUrl}
                          className="w-full h-full rounded-lg border border-slate-300 shadow-inner"
                          title="Secure DMS Document Preview"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Insurance Policies Workspace */}
          {activeTab === 'insurance' && (
            <div className="space-y-6">
              {/* Register Policy Card Form */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">Register Patient Insurance Policy / TPA Card</h3>
                <form onSubmit={handleSavePolicy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Insurance Company</label>
                    <input
                      type="text"
                      required
                      value={insCompany}
                      onChange={(e) => setInsCompany(e.target.value)}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. Star Health, HDFC Ergo"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Policy Number</label>
                    <input
                      type="text"
                      required
                      value={policyNum}
                      onChange={(e) => setPolicyNum(e.target.value)}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. POL-12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Card Number / Member ID</label>
                    <input
                      type="text"
                      required
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value)}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. CARD-98765432"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Valid Till Date</label>
                      <input
                        type="date"
                        required
                        value={validTill}
                        onChange={(e) => setValidTill(e.target.value)}
                        className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Sum Insured (INR)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={sumInsured}
                        onChange={(e) => setSumInsured(e.target.value)}
                        className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        placeholder="e.g. 500000"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPolicy}
                      className="inline-flex items-center px-4 py-2 bg-teal-650 hover:bg-teal-700 bg-teal-650 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPolicy ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                      Register Policy Card
                    </button>
                  </div>
                </form>
              </div>

              {/* Registered Policies list */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Registered Policy Cards</h4>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Policy Number</th>
                      <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Card/Member ID</th>
                      <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Valid Till</th>
                      <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Sum Insured</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {policies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                          No active insurance policies registered for this patient.
                        </td>
                      </tr>
                    ) : (
                      policies.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 font-semibold text-slate-800">{p.insurance_company}</td>
                          <td className="px-6 py-3 text-slate-600 font-mono">{p.policy_number}</td>
                          <td className="px-6 py-3 text-slate-600 font-mono">{p.card_number}</td>
                          <td className="px-6 py-3 text-slate-500 font-mono">{new Date(p.valid_till).toLocaleDateString()}</td>
                          <td className="px-6 py-3 text-right font-bold text-slate-850 text-slate-800">₹{p.sum_insured.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Demographics Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Update Patient Demographics</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdatePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Residential Address</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Emergency Contact Person</label>
                  <input
                    type="text"
                    required
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Emergency Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPatient}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPatient ? <Loader2 className="animate-spin h-4 w-4" /> : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABHA Linking Modal (Phase 4 ABDM integration entrypoint) */}
      {isAbhaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Link ABHA ID</h3>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">SANDBOX</span>
              </div>
              <button onClick={() => setIsAbhaModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {!abhaOtpSent ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Provide the patient's 14-digit ABHA Card Number to send an authentication OTP from the ABDM gateway.</p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">ABHA ID Number</label>
                    <input
                      type="text"
                      required
                      value={abhaNumberInput}
                      onChange={(e) => setAbhaNumberInput(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. 91-1234-5678-9012"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAbhaModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestAbhaOtp}
                      disabled={isAbhaVerifying || !abhaNumberInput}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center"
                    >
                      {isAbhaVerifying && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />} Send SMS OTP
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Enter the 6-digit verification code received on the patient's registered mobile number linked with ABHA/Aadhaar.</p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">SMS Authentication Code (OTP)</label>
                    <input
                      type="text"
                      required
                      value={abhaOtp}
                      onChange={(e) => setAbhaOtp(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-teal-500"
                      placeholder="••••••"
                      maxLength={6}
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setAbhaOtpSent(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleLinkAbha}
                      disabled={isAbhaVerifying || !abhaOtp}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center"
                    >
                      {isAbhaVerifying && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />} Verify & Link Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientDetails;
