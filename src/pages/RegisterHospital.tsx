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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/auth/register-hospital', {
        hospital_name: hospitalName,
        subdomain: subdomain,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_phone: adminPhone,
        plan_id: selectedPlan
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
            <form className="space-y-6 animate-fade-in" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Hospital Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Hospital/Clinic Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fortis Memorial"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="auth-input pl-10 w-full rounded-xl py-3 px-4 focus:outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
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

                {/* Admin Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Admin Mobile Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
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
                <div>
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
