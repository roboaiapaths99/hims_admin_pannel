import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../api/client';
import { Activity, Lock, Mail, AlertCircle, Loader2, Phone, ArrowRight, Shield, Stethoscope, Heart } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'staff' | 'patient'>('staff');

  // Staff credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Patient credentials
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter your mobile phone number.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/patient/send-otp', { phone });
      setOtpSent(true);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to dispatch verification code. Please check the mobile number.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (loginMode === 'staff') {
        if (mfaToken) {
          const response = await apiClient.post('/api/auth/verify-2fa', {
            mfa_token: mfaToken,
            code: mfaCode,
          });
          const { access_token, refresh_token, user } = response.data;
          setAuth(access_token, refresh_token, user);
          navigate(from, { replace: true });
        } else {
          const response = await apiClient.post('/api/auth/login', {
            email,
            password,
          });

          if (response.data.status === 'mfa_required') {
            setMfaToken(response.data.mfa_token);
            setError(null);
          } else {
            const { access_token, refresh_token, user } = response.data;
            setAuth(access_token, refresh_token, user);
            navigate(from, { replace: true });
          }
        }
      } else {
        const response = await apiClient.post('/api/auth/patient/login-phone', {
          phone,
          otp,
        });

        const { access_token, patient } = response.data;
        
        const patientUser = {
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          email: `${patient.mrn.toLowerCase()}@patient.hmis.com`,
          role: 'patient',
          tenant_id: patient.tenant_id,
          hospital_id: null,
          branch_id: patient.branch_id
        };

        setAuth(access_token, access_token, patientUser);
        navigate('/patient/portal', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.detail || 
        'Invalid login credentials. Please verify details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4 font-sans">
      {/* Extra floating orb (middle) */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float-orb 12s ease-in-out infinite 2s',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center relative">
            {/* Pulse ring behind logo */}
            <div className="absolute w-20 h-20 rounded-full bg-teal-400/20 logo-pulse-ring" />
            <div className="relative h-16 w-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
            Hospital HMIS
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-300/80">
            SaaS Multi-Branch EMR Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="auth-card rounded-2xl shadow-2xl p-8">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-7 gap-1">
            <button
              type="button"
              onClick={() => { setLoginMode('staff'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer border-none ${
                loginMode === 'staff'
                  ? 'bg-white text-teal-700 shadow-md shadow-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Hospital Staff
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('patient'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer border-none ${
                loginMode === 'patient'
                  ? 'bg-white text-teal-700 shadow-md shadow-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
              Patient Portal
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-3.5 rounded-xl animate-slide-up flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-red-700 leading-snug">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {loginMode === 'staff' ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {mfaToken ? (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="mfaCode" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Two-Factor Authentication Code (SMS)
                      </label>
                      <button
                        type="button"
                        onClick={() => { setMfaToken(null); setMfaCode(''); setError(null); }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-transparent border-0 cursor-pointer"
                      >
                        Change Credentials
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Shield className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="mfaCode"
                        name="mfaCode"
                        type="text"
                        required
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        className="auth-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                        placeholder="6-digit OTP code"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                        placeholder="doctor@hospital.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="auth-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 cursor-pointer border-0"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={otpSent ? handleSubmit : handleSendOtp}>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    disabled={otpSent}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="auth-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium disabled:opacity-60"
                    placeholder="9999999999"
                  />
                </div>
              </div>

              {otpSent && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="otp" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      One Time Password (OTP)
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[10px] font-bold text-teal-600 hover:text-teal-500 bg-transparent border-0 cursor-pointer"
                    >
                      Change Number
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Shield className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="auth-input block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                      placeholder="6-Digit OTP Code"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-medium">
                    A secure verification code has been sent. Enter the code to verify your mobile identity.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="auth-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 cursor-pointer border-0"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                ) : (
                  <>
                    {otpSent ? 'Verify & Log In' : 'Request OTP Code'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register link */}
          {loginMode === 'staff' ? (
            <div className="mt-5 text-center">
              <p className="text-xs text-slate-500 font-medium">
                Don't have an EMR workspace?{' '}
                <Link to="/register" className="font-bold text-teal-600 hover:text-teal-500 transition-colors">
                  Create Hospital Organization
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-5 text-center">
              <p className="text-xs text-slate-500 font-medium">
                Not registered yet with the hospital?{' '}
                <Link to="/patient/register" className="font-bold text-teal-600 hover:text-teal-500 transition-colors">
                  Register Patient Profile
                </Link>
              </p>
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
export default Login;
