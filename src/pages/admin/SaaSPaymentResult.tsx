import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, Home } from 'lucide-react';

export const SaaSPaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const txnid = searchParams.get('txnid') || 'N/A';
  const message = searchParams.get('message') || 'The transaction failed or was cancelled.';
  
  // Detect if success page by matching pathname
  const isSuccess = window.location.pathname.includes('/success');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
        
        {/* Title / Branding */}
        <div className="flex items-center justify-center space-x-2 text-teal-600">
          <ShieldCheck className="h-7 w-7" />
          <span className="font-extrabold text-xl tracking-tight">MediCloud Platform</span>
        </div>

        {/* Icon & Status */}
        {isSuccess ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-emerald-50 rounded-full border border-emerald-200">
              <CheckCircle className="h-16 w-16 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h2>
            <p className="text-slate-500 text-sm">Your subscription plan has been successfully activated and upgraded.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-rose-50 rounded-full border border-rose-200">
              <AlertTriangle className="h-16 w-16 text-rose-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Payment Failed</h2>
            <p className="text-slate-500 text-sm">{message}</p>
          </div>
        )}

        {/* Details Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-mono font-bold text-slate-800">{txnid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Gateway Provider</span>
            <span className="font-semibold text-slate-800">PayU Checkout</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className={`font-bold uppercase ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isSuccess ? 'Settled' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          {isSuccess ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-100"
            >
              <Home className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/admin/billing/subscription')}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all"
              >
                Retry Payment
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all"
              >
                Home
              </button>
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-400">
          MediCloud Health Systems Pvt. Ltd. &copy; 2026. All Rights Reserved.
        </div>

      </div>
    </div>
  );
};

export default SaaSPaymentResult;
