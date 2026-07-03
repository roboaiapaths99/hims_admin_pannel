import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { CheckCircle, Printer, ArrowRight, Loader2, Landmark, FileText, Calendar, Hash } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  patient_name?: string;
  grand_total: number;
}

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const invoiceId = searchParams.get('invoice_id');
  const txnid = searchParams.get('txnid');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    } else {
      setIsLoading(false);
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      const res = await apiClient.get(`/api/billing/invoices/${invoiceId}`);
      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to load success invoice details', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 font-sans">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying transaction integrity...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-6 font-sans antialiased text-slate-800 print:shadow-none print:border-0 print:my-0 print:p-0">
      
      {/* Icon checkmark */}
      <div className="flex justify-center print:hidden">
        <div className="bg-emerald-50 rounded-full p-4 border border-emerald-100">
          <CheckCircle className="h-12 w-12 text-emerald-600" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Payment Successful</h2>
        <p className="text-xs text-slate-500 font-medium">Your online transaction has been completed and verified successfully.</p>
      </div>

      {/* Transaction Details Card */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-left text-xs font-semibold text-slate-600 space-y-3 print:bg-white print:border-slate-200">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Receipt summary</span>
        
        {invoice?.patient_name && (
          <div className="flex justify-between">
            <span>Patient:</span>
            <span className="text-slate-800 font-bold">{invoice.patient_name}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="flex items-center"><FileText className="h-3.5 w-3.5 mr-1 text-slate-400" /> Invoice No:</span>
          <span className="font-mono text-slate-800">{invoice?.invoice_number || 'N/A'}</span>
        </div>

        <div className="flex justify-between">
          <span className="flex items-center"><Hash className="h-3.5 w-3.5 mr-1 text-slate-400" /> Transaction ID:</span>
          <span className="font-mono text-slate-800">{txnid || 'N/A'}</span>
        </div>

        <div className="flex justify-between">
          <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" /> Payment Date:</span>
          <span className="text-slate-800">{new Date().toLocaleDateString()}</span>
        </div>

        <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-slate-800">
          <span>Amount Settled:</span>
          <span className="font-mono text-emerald-700">₹{invoice?.grand_total.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      {/* Call to Actions (Hidden during print) */}
      <div className="flex flex-col space-y-2 pt-2 print:hidden text-xs">
        <button
          onClick={handlePrint}
          className="inline-flex justify-center items-center py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-sm cursor-pointer border-0"
        >
          <Printer className="h-4 w-4 mr-1.5" /> Print Receipt Voucher
        </button>

        {invoiceId && (
          <button
            onClick={() => navigate(`/billing/invoice/view/${invoiceId}`)}
            className="inline-flex justify-center items-center py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-lg font-bold shadow-sm cursor-pointer"
          >
            View Invoice Details <ArrowRight className="h-4 w-4 ml-1.5 text-slate-400" />
          </button>
        )}
      </div>

    </div>
  );
};

export default PaymentSuccess;
