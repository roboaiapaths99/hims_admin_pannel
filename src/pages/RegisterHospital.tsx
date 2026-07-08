import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../api/client';
import { Activity, User, Shield, Phone, Mail, Building, Globe, Loader2, Check, ArrowRight, ArrowLeft, Sparkles, Zap, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: '₹0',
    duration: '14 Days Trial',
    max_branches: 1,
    max_staff: 5,
    max_patients: 100,
    features: ['1 Branch Location', 'Up to 5 staff members', '100 Active patient files', 'Standard Prescriptions & Billing'],
    popular: false,
    icon: Zap,
    gradient: 'from-slate-500 to-slate-600',
  },
  {
    id: 'starter_plan',
    name: 'Clinic Standard',
    price: '₹2,499',
    duration: 'per month',
    max_branches: 2,
    max_staff: 15,
    max_patients: 1000,
    features: ['2 Branch Locations', 'Up to 15 staff members', '1000 Active patient files', 'Live Queue management', 'Standard analytics dashboards'],
    popular: true,
    icon: Sparkles,
    gradient: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'enterprise_plan',
    name: 'Enterprise Hospital',
    price: '₹9,999',
    duration: 'per month',
    max_branches: 10,
    max_staff: 100,
    max_patients: 10000,
    features: ['10 Branch Locations', 'Up to 100 staff members', 'Unlimited patient profiles', 'Real-time Ambulance tracking', 'ABHA Sandbox integration', 'Dedicated account executive support'],
    popular: false,
    icon: Crown,
    gradient: 'from-indigo-500 to-purple-600',
  }
];

export const RegisterHospital: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('free_trial');

  // Input states
  const [hospitalName, setHospitalName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // GSTIN states
  const [gstin, setGstin] = useState('');
  const [isGstinVerified, setIsGstinVerified] = useState(false);
  const [officeAddress, setOfficeAddress] = useState('');
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [gstinSuccess, setGstinSuccess] = useState<string | null>(null);

  // Admin Phone OTP states
  const [adminOtp, setAdminOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);

  // License Document states
  const [licenseUrl, setLicenseUrl] = useState('');
  const [isLicenseUploaded, setIsLicenseUploaded] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseSuccess, setLicenseSuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyGstin = async () => {
    if (!gstin || gstin.length !== 15) {
      setGstinError('Please enter a valid 15-digit Indian GSTIN.');
      return;
    }
    setGstinLoading(true);
    setGstinError(null);
    setGstinSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/gstin/verify', { gstin });
      const record = res.data.data;
      setHospitalName(record.legal_name);
      setOfficeAddress(record.address);
      setIsGstinVerified(true);
      setGstinSuccess(res.data.message || 'GSTIN verified successfully.');
    } catch (err: any) {
      console.error(err);
      setGstinError(err.response?.data?.detail || 'Failed to verify GSTIN against the tax registry.');
    } finally {
      setGstinLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!adminPhone || adminPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setPhoneLoading(true);
    setPhoneError(null);
    setPhoneSuccess(null);
    try {
      const res = await apiClient.post('/api/auth/public/tenant/send-otp', {
        phone: adminPhone
      });
      setIsPhoneOtpSent(true);
      setPhoneSuccess(res.data.message || 'OTP verification code sent.');
    } catch (err: any) {
      console.error(err);
      setPhoneError(err.response?.data?.detail || 'Failed to dispatch verification code.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!adminOtp || adminOtp.length !== 6) {
      setPhoneError('Please enter a 6-digit verification code.');
      return;
    }
    setPhoneLoading(true);
    setPhoneError(null);
    try {
      await apiClient.post('/api/auth/public/tenant/verify-otp', {
        phone: adminPhone,
        otp: adminOtp
      });
      setIsPhoneVerified(true);
      setIsPhoneOtpSent(false);
      setPhoneSuccess('Admin phone number verified successfully!');
    } catch (err: any) {
      console.error(err);
      setPhoneError(err.response?.data?.detail || 'Invalid verification OTP code.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleUploadLicense = async (file: File) => {
    setLicenseLoading(true);
    setLicenseError(null);
    setLicenseSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/api/auth/public/upload-license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setLicenseUrl(res.data.url);
      setIsLicenseUploaded(true);
      setLicenseSuccess('Establishment License uploaded successfully.');
    } catch (err: any) {
      console.error(err);
      setLicenseError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isGstinVerified) {
      setError('Please verify your hospital GSTIN registry credentials first.');
      return;
    }

    if (!isPhoneVerified) {
      setError('Please verify your administrator mobile phone number via OTP.');
      return;
    }

    if (!isLicenseUploaded) {
      setError('Please upload your Medical Establishment Registration License.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/register-hospital', {
        hospital_name: hospitalName,
        subdomain: subdomain,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_phone: adminPhone,
        plan_id: selectedPlan,
        gstin: gstin,
        license_document_url: licenseUrl,
        office_address: officeAddress
      });

      const { access_token, refresh_token, user } = response.data;
      setAuth(access_token, refresh_token, user);

      // Redirect directly to the dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register your hospital. Please check domain availability.');
      setStep(1); // Return to input details
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4 font-sans">
      {/* Extra floating orb */}
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float-orb 14s ease-in-out infinite 3s',
        }}
      />

      <div className="w-full max-w-4xl relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center relative">
            <div className="absolute w-20 h-20 rounded-full bg-teal-400/20 logo-pulse-ring" />
            <div className="relative h-16 w-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-500/30 -rotate-3 hover:rotate-0 transition-transform duration-500">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
            Create Your Workspace
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-300/80">
            Set up your Hospital EMR in under 2 minutes
          </p>
        </div>

        {/* Main Card */}
        <div className="auth-card rounded-2xl shadow-2xl p-8">
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-400 ${
              step === 1 
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20' 
                : 'bg-teal-50 text-teal-700'
            }`}>
              {step > 1 ? <Check className="h-3.5 w-3.5" /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>}
              Hospital Details
            </div>
            <div className="w-8 h-0.5 bg-slate-200 rounded-full" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-400 ${
              step === 2 
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              Select Plan
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-3.5 rounded-xl animate-slide-up flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Shield className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-red-700 leading-snug">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6 animate-fade-in" onSubmit={(e) => { 
              e.preventDefault(); 
              if (!isGstinVerified) {
                setError('Please verify your hospital GSTIN registry credentials first.');
                return;
              }
              if (!isPhoneVerified) {
                setError('Please verify your administrator mobile phone number via OTP.');
                return;
              }
              if (!isLicenseUploaded) {
                setError('Please upload your Medical Establishment Registration License.');
                return;
              }
              setError(null);
              setStep(2); 
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* GSTIN Verification */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-teal-600" />
                      Step A: Corporate Identity (GSTIN Lookup)
                    </span>
                    {isGstinVerified && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black uppercase">
                        Verified Business
                      </span>
                    )}
                  </div>

                  {gstinError && (
                    <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{gstinError}</p>
                  )}
                  {gstinSuccess && (
                    <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{gstinSuccess}</p>
                  )}

                  {!isGstinVerified ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                        placeholder="Enter 15-Digit GSTIN (e.g. 07AAAAA1111A1Z1)"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyGstin}
                        disabled={gstinLoading}
                        className="px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                      >
                        {gstinLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify GSTIN'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 font-semibold space-y-1">
                      <div>GSTIN: <strong className="text-slate-800">{gstin}</strong></div>
                      <div>Legal Entity Name: <strong className="text-slate-800">{hospitalName}</strong></div>
                      <div>Registered Office Address: <strong className="text-slate-800">{officeAddress}</strong></div>
                    </div>
                  )}
                </div>

                {/* Admin Phone Verification */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-teal-600" />
                      Step B: Primary Contact (Mobile OTP Verification)
                    </span>
                    {isPhoneVerified && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black uppercase">
                        Mobile Verified
                      </span>
                    )}
                  </div>

                  {phoneError && (
                    <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{phoneError}</p>
                  )}
                  {phoneSuccess && (
                    <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{phoneSuccess}</p>
                  )}

                  {!isPhoneVerified ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            maxLength={10}
                            disabled={isPhoneOtpSent}
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ''))}
                            className="auth-input block w-full pl-9 pr-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                            placeholder="Enter 10-Digit Admin Mobile"
                          />
                        </div>
                        {!isPhoneOtpSent && (
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={phoneLoading}
                            className="px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                          >
                            {phoneLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send OTP'}
                          </button>
                        )}
                      </div>

                      {isPhoneOtpSent && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={adminOtp}
                              onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                              className="auth-input block w-full px-3 py-2 text-xs rounded-xl text-slate-900 focus:outline-none"
                              placeholder="Enter 6-Digit OTP"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyPhoneOtp}
                              disabled={phoneLoading}
                              className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition border-none cursor-pointer"
                            >
                              {phoneLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm OTP'}
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 font-semibold px-1">
                            A verification code has been sent via SMS. Enter the 6-digit OTP code to verify your mobile number.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 font-semibold">
                      Verified Mobile: <strong className="text-slate-800">{adminPhone}</strong>
                    </div>
                  )}
                </div>

                {/* Clinical Establishment License Upload */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-teal-600" />
                      Step C: Compliance File (Medical Registration License)
                    </span>
                    {isLicenseUploaded && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black uppercase">
                        License Attached
                      </span>
                    )}
                  </div>

                  {licenseError && (
                    <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{licenseError}</p>
                  )}
                  {licenseSuccess && (
                    <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{licenseSuccess}</p>
                  )}

                  {!isLicenseUploaded ? (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadLicense(file);
                        }}
                        className="block w-full text-xs text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-xl file:border-0
                          file:text-xs file:font-semibold
                          file:bg-teal-50 file:text-teal-700
                          hover:file:bg-teal-100 file:cursor-pointer"
                      />
                      <p className="mt-1.5 text-[10px] text-slate-400 font-medium">
                        Supported files: PDF, PNG, JPEG (Max 5MB). File will upload directly to S3.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
                      <span>Document URL: <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-bold">View Uploaded License</a></span>
                      <button
                        type="button"
                        onClick={() => {
                          setLicenseUrl('');
                          setIsLicenseUploaded(false);
                          setLicenseSuccess(null);
                        }}
                        className="text-[10px] bg-red-100 text-red-800 border-none font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-red-200"
                      >
                        Remove Document
                      </button>
                    </div>
                  )}
                </div>

                {/* Hospital Name (read-only once GSTIN is verified) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Hospital/Clinic Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      readOnly={isGstinVerified}
                      placeholder="GSTIN lookup auto-fills legal name"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="auth-input pl-10 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400 read-only:bg-slate-100 read-only:opacity-80"
                    />
                  </div>
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Workspace URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. fortis"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                      className="auth-input pl-10 pr-24 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-bold">.hmis.com</span>
                  </div>
                </div>

                {/* Admin Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Administrator Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="auth-input pl-10 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Admin Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Admin Corporate Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. rajesh@fortis.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="auth-input pl-10 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Secure Password</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="auth-input pl-10 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2">
                <Link to="/login" className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign-in
                </Link>
                <button
                  type="submit"
                  className="auth-btn flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg cursor-pointer border-0"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {PLANS.map((plan) => {
                  const IconComponent = plan.icon;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`plan-card-hover relative rounded-2xl p-6 cursor-pointer flex flex-col justify-between transition-all ${
                        selectedPlan === plan.id
                          ? 'border-2 border-teal-500 bg-teal-50/30 shadow-xl shadow-teal-500/10 ring-1 ring-teal-500/20'
                          : 'border-2 border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                          Most Popular
                        </span>
                      )}

                      {/* Selected indicator */}
                      {selectedPlan === plan.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}

                      <div>
                        {/* Plan icon */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>

                        <h4 className="text-base font-bold text-slate-800">{plan.name}</h4>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                          <span className="text-xs text-slate-500 font-medium">/ {plan.duration}</span>
                        </div>
                        <ul className="mt-5 space-y-2.5">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-start text-xs text-slate-600">
                              <Check className="h-3.5 w-3.5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to details
                </button>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                    <span className="text-sm text-slate-500 font-bold">Creating your workspace...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    className="auth-btn flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg cursor-pointer border-0"
                  >
                    <Sparkles className="h-4 w-4" />
                    Launch Workspace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400/60 font-medium">
          Secured with end-to-end encryption · HIPAA compliant
        </p>
      </div>
    </div>
  );
};
export default RegisterHospital;
