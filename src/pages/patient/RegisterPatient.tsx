import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { apiClient } from '../../api/client';
import { 
  Activity, User, Phone, Mail, MapPin, Calendar, 
  ShieldCheck, ArrowLeft, Loader2, AlertCircle 
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Hospital {
  id: string;
  name: string;
  subdomain: string;
  branches: Branch[];
}

export const RegisterPatient: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // ABDM / ABHA identity verification state
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaTxnId, setAbhaTxnId] = useState('');
  const [isAbhaOtpSent, setIsAbhaOtpSent] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [abhaError, setAbhaError] = useState<string | null>(null);
  const [abhaSuccess, setAbhaSuccess] = useState<string | null>(null);

  // Verification method state
  const [verificationMethod, setVerificationMethod] = useState<'abha' | 'gov_id'>('abha');

  // Alternative Government ID states
  const [govIdType, setGovIdType] = useState<'PAN' | 'VOTER_ID' | 'DRIVING_LICENSE' | 'AADHAAR'>('PAN');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [govIdDocUrl, setGovIdDocUrl] = useState('');
  const [isGovIdVerified, setIsGovIdVerified] = useState(false);
  const [govIdLoading, setGovIdLoading] = useState(false);
  const [govIdError, setGovIdError] = useState<string | null>(null);
  const [govIdSuccess, setGovIdSuccess] = useState<string | null>(null);

  // Aadhaar OTP states
  const [aadhaarRefId, setAadhaarRefId] = useState('');
  const [isAadhaarOtpSent, setIsAadhaarOtpSent] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState('');

  // Hospital states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setIsLoadingHospitals(true);
    try {
      const res = await apiClient.get('/api/auth/public/hospitals');
      setHospitals(res.data);
    } catch (err: any) {
      console.error('Failed to load hospitals:', err);
      setError('Unable to load hospital directories. Please verify network connectivity.');
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleHospitalChange = (hospitalId: string) => {
    const hosp = hospitals.find(h => h.id === hospitalId) || null;
    setSelectedHospital(hosp);
    setSelectedBranch(hosp && hosp.branches.length > 0 ? hosp.branches[0] : null);
  };

  const handleSendAbhaOtp = async () => {
    if (!abhaNumber || abhaNumber.replace(/-/g, '').length !== 14) {
      setAbhaError('Please enter a valid 14-digit ABHA number (e.g. 91-1234-5678-9012).');
      return;
    }
    setAbhaLoading(true);
    setAbhaError(null);
    setAbhaSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/abdm/verify', {
        abha_number: abhaNumber
      });
      setAbhaTxnId(res.data.transaction_id);
      setIsAbhaOtpSent(true);
      setAbhaSuccess(res.data.message || 'OTP verification code sent.');
    } catch (err: any) {
      console.error(err);
      setAbhaError(err.response?.data?.detail || 'Failed to dispatch verification code.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleVerifyAbhaOtp = async () => {
    if (!abhaOtp || abhaOtp.length !== 6) {
      setAbhaError('Please enter a 6-digit verification code.');
      return;
    }
    setAbhaLoading(true);
    setAbhaError(null);
    try {
      const res = await apiClient.post('/api/auth/public/abdm/confirm', {
        abha_number: abhaNumber,
        otp: abhaOtp,
        transaction_id: abhaTxnId
      });
      
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      setPhone(details.phone);
      setDob(details.dob);
      setGender(details.gender);
      setAddress(details.address);
      setAbhaAddress(details.abha_address);
      
      setIsIdentityVerified(true);
      setIsAbhaOtpSent(false);
      setAbhaSuccess('Aadhaar identity verified! Legal name, DOB, and Mobile are synced and locked.');
    } catch (err: any) {
      console.error(err);
      setAbhaError(err.response?.data?.detail || 'Invalid verification OTP code.');
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    const cleanAadhaar = govIdNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      setGovIdError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/aadhaar/send-otp', {
        aadhaar_number: cleanAadhaar
      });
      setAadhaarRefId(res.data.ref_id);
      setIsAadhaarOtpSent(true);
      setGovIdSuccess('Verification OTP sent to Aadhaar-registered mobile.');
    } catch (err: any) {
      console.error(err);
      setGovIdError(err.response?.data?.detail || 'Failed to dispatch Aadhaar OTP verification code.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length !== 6) {
      setGovIdError('Please enter a valid 6-digit OTP.');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    try {
      const res = await apiClient.post('/api/auth/public/aadhaar/verify-otp', {
        otp: aadhaarOtp,
        ref_id: aadhaarRefId
      });
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      if (details.phone) setPhone(details.phone);
      if (details.dob) setDob(details.dob);
      if (details.gender) setGender(details.gender);
      if (details.address) setAddress(details.address);
      setIsGovIdVerified(true);
      setIsAadhaarOtpSent(false);
      setGovIdSuccess('Aadhaar identity verified successfully.');
    } catch (err: any) {
      console.error(err);
      setGovIdError(err.response?.data?.detail || 'Invalid Aadhaar OTP code.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleVerifyGovId = async () => {
    if (!govIdNumber) {
      setGovIdError('Please enter your Government ID number.');
      return;
    }
    if (!firstName) {
      setGovIdError('Please enter your First Name before verifying (used to match registry details).');
      return;
    }
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const typedName = `${firstName} ${lastName}`.trim();
      const res = await apiClient.post('/api/auth/public/govt-id/verify', {
        id_type: govIdType,
        id_number: govIdNumber,
        legal_name: typedName
      });
      const details = res.data.patient_details;
      setFirstName(details.first_name);
      setLastName(details.last_name);
      if (details.dob) setDob(details.dob);
      if (details.gender) setGender(details.gender);
      if (details.address) setAddress(details.address);
      setIsGovIdVerified(true);
      setGovIdSuccess(`${govIdType} registry record matched and verified successfully!`);
    } catch (err: any) {
      console.error(err);
      setGovIdError(err.response?.data?.detail || 'Failed to verify Government ID registry record.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleUploadGovIdDoc = async (file: File) => {
    setGovIdLoading(true);
    setGovIdError(null);
    setGovIdSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/api/auth/public/upload-license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGovIdDocUrl(res.data.url);
      setGovIdSuccess('Government ID copy uploaded successfully.');
    } catch (err: any) {
      console.error(err);
      setGovIdError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setGovIdLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !phone || !dob || !address || !emergencyName || !emergencyPhone) {
      setError('Please fill in all required fields.');
      return;
    }

    if (phone.length !== 10 || emergencyPhone.length !== 10) {
      setError('Mobile numbers must be exactly 10 digits.');
      return;
    }

    if (!selectedHospital || !selectedBranch) {
      setError('Please select a target hospital and branch to register.');
      return;
    }

    if (verificationMethod === 'abha' && !isIdentityVerified) {
      setError('Please complete the Aadhaar ABHA OTP identity verification.');
      return;
    }

    if (verificationMethod === 'gov_id' && !isGovIdVerified) {
      setError('Please verify your alternative Government ID registry record.');
      return;
    }

    if (verificationMethod === 'gov_id' && !govIdDocUrl) {
      setError('Please upload a copy of your Government ID document.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email || null,
        dob: dob,
        gender: gender,
        address: address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        tenant_id: selectedHospital.id,
        branch_id: selectedBranch.id,
        abha_number: verificationMethod === 'abha' ? (abhaNumber || null) : null,
        abha_address: verificationMethod === 'abha' ? (abhaAddress || null) : null,
        govt_id_type: verificationMethod === 'gov_id' ? govIdType : null,
        govt_id_number: verificationMethod === 'gov_id' ? govIdNumber : null,
        govt_id_document_url: verificationMethod === 'gov_id' ? govIdDocUrl : null,
        consent_signed: isIdentityVerified || isGovIdVerified
      };

      const res = await apiClient.post('/api/auth/patient/register', payload);
      const { access_token, patient: patientData } = res.data;

      const patientUser = {
        id: patientData.id,
        name: `${patientData.first_name} ${patientData.last_name}`,
        email: `${patientData.mrn.toLowerCase()}@patient.hmis.com`,
        role: 'patient',
        tenant_id: patientData.tenant_id,
        hospital_id: null,
        branch_id: patientData.branch_id
      };

      setAuth(access_token, access_token, patientUser);
      navigate('/patient/portal', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center relative">
            <div className="absolute w-16 h-16 rounded-full bg-teal-400/20 logo-pulse-ring" />
            <div className="relative h-12 w-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black text-white">Create Patient Account</h2>
          <p className="text-xs font-semibold text-slate-300">Enter your medical details to register your digital EMR file</p>
        </div>

        <div className="auth-card rounded-2xl shadow-2xl p-6 md:p-8">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2 animate-pulse">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <p className="text-xs font-bold text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Verification Method Tab Selector */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setVerificationMethod('abha');
                  setIsIdentityVerified(false);
                  setIsGovIdVerified(false);
                  setAbhaError(null);
                  setGovIdError(null);
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border-none cursor-pointer transition-all duration-300 ${
                  verificationMethod === 'abha'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow'
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                ABHA ID Verification
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationMethod('gov_id');
                  setIsIdentityVerified(false);
                  setIsGovIdVerified(false);
                  setAbhaError(null);
                  setGovIdError(null);
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border-none cursor-pointer transition-all duration-300 ${
                  verificationMethod === 'gov_id'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow'
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Alternative Govt ID
              </button>
            </div>

            {verificationMethod === 'abha' ? (
              /* ABDM ABHA Verification Section */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-teal-600" />
                    Option A: Link ABDM ABHA ID
                  </span>
                  {isIdentityVerified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black uppercase">
                      KYC Verified
                    </span>
                  )}
                </div>

                {abhaError && (
                  <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{abhaError}</p>
                )}
                {abhaSuccess && (
                  <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{abhaSuccess}</p>
                )}

                {!isIdentityVerified ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          disabled={isAbhaOtpSent}
                          value={abhaNumber}
                          onChange={(e) => setAbhaNumber(e.target.value)}
                          className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                          placeholder="14-Digit ABHA (e.g. 91-1234-5678-9012)"
                        />
                      </div>
                      {!isAbhaOtpSent && (
                        <button
                          type="button"
                          onClick={handleSendAbhaOtp}
                          disabled={abhaLoading}
                          className="px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                        >
                          {abhaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send OTP'}
                        </button>
                      )}
                    </div>

                    {isAbhaOtpSent && (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={abhaOtp}
                            onChange={(e) => setAbhaOtp(e.target.value.replace(/\D/g, ''))}
                            className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                            placeholder="Enter 6-Digit OTP"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyAbhaOtp}
                            disabled={abhaLoading}
                            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                          >
                            {abhaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verify'}
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold px-1">
                          An Aadhaar-linked OTP verification code has been dispatched. Enter the 6-digit code to link your medical account.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 font-semibold space-y-1">
                    <div>ABHA ID: <strong className="text-slate-800">{abhaNumber}</strong></div>
                    <div>ABHA Address: <strong className="text-slate-800">{abhaAddress}</strong></div>
                  </div>
                )}
              </div>
            ) : (
              /* Alternative Government ID Fallback Section */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-teal-600" />
                    Option B: Alternative Government ID
                  </span>
                  {isGovIdVerified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black uppercase">
                      Gov ID Verified
                    </span>
                  )}
                </div>

                {govIdError && (
                  <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{govIdError}</p>
                )}
                {govIdSuccess && (
                  <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{govIdSuccess}</p>
                )}

                {!isGovIdVerified ? (
                  <div className="space-y-3">
                    {/* ID Type Selector */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Select ID Card Type</label>
                      <select
                        value={govIdType}
                        onChange={(e) => {
                          setGovIdType(e.target.value as any);
                          setIsAadhaarOtpSent(false);
                          setGovIdError(null);
                        }}
                        className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none bg-white font-medium"
                      >
                        <option value="PAN">PAN Card (Income Tax Dept)</option>
                        <option value="VOTER_ID">Voter ID (EPIC Number)</option>
                        <option value="DRIVING_LICENSE">Driving License (RTO)</option>
                        <option value="AADHAAR">Aadhaar (OKYC OTP Verification)</option>
                      </select>
                    </div>

                    {/* ID Number input */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">ID Number</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={govIdNumber}
                          onChange={(e) => setGovIdNumber(govIdType === 'AADHAAR' ? e.target.value.replace(/\D/g, '') : e.target.value.toUpperCase())}
                          className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                          placeholder={
                            govIdType === 'PAN' ? 'e.g. ABCDE1234F' :
                            govIdType === 'VOTER_ID' ? 'e.g. XYZ1234567' :
                            govIdType === 'DRIVING_LICENSE' ? 'e.g. DL1420110012345' :
                            'Enter 12-Digit Aadhaar'
                          }
                        />
                        {govIdType !== 'AADHAAR' && (
                          <button
                            type="button"
                            onClick={handleVerifyGovId}
                            disabled={govIdLoading}
                            className="px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                          >
                            {govIdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify ID'}
                          </button>
                        )}
                        {govIdType === 'AADHAAR' && !isAadhaarOtpSent && (
                          <button
                            type="button"
                            onClick={handleSendAadhaarOtp}
                            disabled={govIdLoading}
                            className="px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                          >
                            {govIdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send OTP'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Aadhaar OTP Entry */}
                    {govIdType === 'AADHAAR' && isAadhaarOtpSent && (
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-500">6-Digit Aadhaar OTP</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={aadhaarOtp}
                            onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                            className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                            placeholder="Enter 6-Digit OTP"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyAadhaarOtp}
                            disabled={govIdLoading}
                            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                          >
                            {govIdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 font-semibold space-y-1">
                    <div>Government ID Type: <strong className="text-slate-800">{govIdType}</strong></div>
                    <div>ID Number: <strong className="text-slate-800">{govIdNumber}</strong></div>
                  </div>
                )}

                {/* ID Document Scan File upload */}
                <div className="border-t border-slate-200/80 pt-3">
                  <label className="block text-[9px] font-bold text-slate-500 mb-1.5">Upload Government ID Copy (PDF/Image)</label>
                  {!govIdDocUrl ? (
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadGovIdDoc(file);
                      }}
                      className="block w-full text-xs text-slate-500
                        file:mr-4 file:py-1.5 file:px-3
                        file:rounded-xl file:border-0
                        file:text-[10px] file:font-bold
                        file:bg-teal-50 file:text-teal-700
                        hover:file:bg-teal-100 file:cursor-pointer"
                    />
                  ) : (
                    <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl text-xs">
                      <span className="font-semibold text-slate-700">ID Copy Attached</span>
                      <button
                        type="button"
                        onClick={() => setGovIdDocUrl('')}
                        className="text-[9px] font-extrabold bg-red-100 hover:bg-red-200 text-red-800 border-none px-2.5 py-1 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">First Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    readOnly={isIdentityVerified || isGovIdVerified}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none read-only:bg-slate-100 read-only:opacity-80"
                    placeholder="e.g. John"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Last Name *</label>
                <input
                  type="text"
                  required
                  readOnly={isIdentityVerified || isGovIdVerified}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none read-only:bg-slate-100 read-only:opacity-80"
                  placeholder="e.g. Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Mobile Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    readOnly={isIdentityVerified || isGovIdVerified}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none read-only:bg-slate-100 read-only:opacity-80"
                    placeholder="10-digit number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    readOnly={isIdentityVerified || isGovIdVerified}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none read-only:bg-slate-100 read-only:opacity-80"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Gender *</label>
                <select
                  value={gender}
                  disabled={isIdentityVerified || isGovIdVerified}
                  onChange={(e) => setGender(e.target.value)}
                  className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none bg-white font-medium disabled:bg-slate-100 disabled:opacity-80"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Home Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  required
                  rows={2}
                  readOnly={isIdentityVerified || isGovIdVerified}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none read-only:bg-slate-100 read-only:opacity-80"
                  placeholder="Street, City, Pin Code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Emergency Name *</label>
                <input
                  type="text"
                  required
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Emergency Phone *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                  className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                  placeholder="10-digit phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Hospital Tenant *</label>
                {isLoadingHospitals ? (
                  <div className="flex items-center space-x-2 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                    <span className="text-[10px] text-slate-400">Loading directory...</span>
                  </div>
                ) : (
                  <select
                    onChange={(e) => handleHospitalChange(e.target.value)}
                    value={selectedHospital?.id || ''}
                    required
                    className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none bg-white font-medium"
                  >
                    <option value="">-- Choose Hospital --</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Hospital Branch *</label>
                <select
                  onChange={(e) => setSelectedBranch(selectedHospital?.branches.find(b => b.id === e.target.value) || null)}
                  value={selectedBranch?.id || ''}
                  required
                  disabled={!selectedHospital}
                  className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none bg-white font-medium disabled:bg-slate-100"
                >
                  <option value="">-- Choose Branch --</option>
                  {selectedHospital?.branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 focus:outline-none disabled:opacity-50 cursor-pointer border-0 mt-2 shadow-md"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4 text-white" />
              ) : (
                <>
                  Register & Sign In
                  <ShieldCheck className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link to="/login" className="inline-flex items-center text-xs font-semibold text-teal-600 hover:text-teal-700 transition">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Already registered? Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
