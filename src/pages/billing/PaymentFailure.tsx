import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

export const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoice_id');
  const txnid = searchParams.get('txnid');
  const message = searchParams.get('message') || 'Transaction was declined by the bank or cancelled by user.';

  const handleRetry = () => {
    if (invoiceId) {
      navigate(`/payment/checkout/${invoiceId}`);
    } else {
      navigate('/billing/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-6 font-sans antialiased text-slate-800">
      
      {/* Icon warning */}
      <div className="flex justify-center">
        <div className="bg-rose-50 rounded-full p-4 border border-rose-100">
          <AlertTriangle className="h-12 w-12 text-rose-600" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Payment Failed</h2>
        <p className="text-xs text-slate-500 font-medium">Your online transaction could not be processed successfully.</p>
      </div>

      {/* Details Card */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-left text-xs font-semibold text-slate-600 space-y-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Error logs</span>

        <div className="flex flex-col space-y-1">
          <span className="text-slate-400">Reason:</span>
          <span className="text-rose-700 font-bold leading-relaxed">{message}</span>
        </div>

        {txnid && (
          <div className="flex justify-between border-t border-slate-200/60 pt-2.5">
            <span>Transaction ID:</span>
            <span className="font-mono text-slate-800">{txnid}</span>
          </div>
        )}
      </div>

      {/* Call to Actions */}
      <div className="flex flex-col space-y-2 pt-2 text-xs">
        <button
          onClick={handleRetry}
          className="inline-flex justify-center items-center py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm cursor-pointer border-0"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" /> Try Payment Again
        </button>

        <button
          onClick={() => {
            if (invoiceId) {
              navigate(`/billing/invoice/view/${invoiceId}`);
            } else {
              navigate('/billing/dashboard');
            }
          }}
          className="inline-flex justify-center items-center py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-lg font-bold shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Invoice
        </button>
      </div>

    </div>
  );
};

export default PaymentFailure;
