import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, Printer, CreditCard, DollarSign, CheckCircle, 
  AlertCircle, Loader2, Calendar, User, FileText, Landmark,
  Receipt, MapPin, Phone, Mail, Hash, Layers
} from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  base_price: number;
  gst_rate: number;
  discount_percentage: number;
  tax_amount: number;
  line_total: number;
}

interface Invoice {
  id: string;
  tenant_id: string;
  branch_id: string;
  invoice_number: string;
  patient_id: string;
  visit_id?: string;
  items: InvoiceItem[];
  subtotal: number;
  gst_total: number;
  discount_amount: number;
  grand_total: number;
  payment_status: 'unpaid' | 'paid' | 'due';
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  patient_name?: string;
  doctor_name?: string;
}

interface Payment {
  id: string;
  tenant_id: string;
  branch_id: string;
  invoice_id: string;
  payment_method: 'Cash' | 'Card' | 'UPI' | 'PayU';
  amount_paid: number;
  transaction_reference?: string;
  created_at: string;
  created_by: string;
}

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
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  contact_number: string;
}

export const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Drawer Form State
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentOptions, setPaymentOptions] = useState<{ id: string; name: string }[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInvoiceDetails();
    }
  }, [id]);

  const loadInvoiceDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch invoice record
      const invoiceRes = await apiClient.get(`/api/billing/invoices/${id}`);
      const invoiceData: Invoice = invoiceRes.data;
      setInvoice(invoiceData);

      // Default amount paid to pay balance
      const currentPaid = await loadPaymentsAndCalculatePaid(invoiceData.id, invoiceData.grand_total);

      // 2. Fetch patient demographics
      if (invoiceData.patient_id) {
        const patientRes = await apiClient.get(`/api/patients/${invoiceData.patient_id}`);
        setPatient(patientRes.data);
      }

      // 3. Fetch branch details
      try {
        const branchesRes = await apiClient.get('/api/branches');
        const activeBranch = branchesRes.data.find((b: Branch) => b.id === invoiceData.branch_id);
        if (activeBranch) {
          setBranch(activeBranch);
        }
      } catch (branchErr) {
        console.error('Failed to load branches info', branchErr);
      }

      // 4. Fetch dynamic payment settings & methods
      try {
        const paySettingsRes = await apiClient.get('/api/org/branches/settings/payments');
        const opts = [];
        if (paySettingsRes.data.cash_enabled !== false) opts.push({ id: 'Cash', name: '💵 Cash' });
        if (paySettingsRes.data.card_enabled !== false) opts.push({ id: 'Card', name: '💳 Card Payment' });
        if (paySettingsRes.data.upi_enabled !== false) opts.push({ id: 'UPI', name: '📱 UPI / QR Scan' });
        
        opts.push({ id: 'PayU', name: '🌐 Online Gateway (PayU)' });
        
        const customs = paySettingsRes.data.custom_methods || [];
        customs.forEach((m: any) => {
          if (m.is_active) {
            opts.push({ id: m.name, name: `💼 ${m.name}` });
          }
        });
        
        setPaymentOptions(opts);
        if (opts.length > 0) {
          setPaymentMethod(opts[0].id);
        }
      } catch (payErr) {
        console.error("Failed to load payment options, falling back to standard list", payErr);
        setPaymentOptions([
          { id: 'Cash', name: '💵 Cash' },
          { id: 'Card', name: '💳 Card Payment' },
          { id: 'UPI', name: '📱 UPI / QR Scan' },
          { id: 'PayU', name: '🌐 Online Gateway (PayU)' }
        ]);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load invoice details.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentsAndCalculatePaid = async (invoiceId: string, grandTotal: number): Promise<number> => {
    try {
      const paymentsRes = await apiClient.get(`/api/billing/invoices/${invoiceId}/payments`);
      const paymentList: Payment[] = paymentsRes.data;
      setPayments(paymentList);
      
      const totalPaid = paymentList.reduce((sum, p) => sum + p.amount_paid, 0);
      const remainingBalance = Math.max(0, grandTotal - totalPaid);
      setAmountPaid(remainingBalance.toFixed(2));
      return totalPaid;
    } catch (err) {
      console.error('Failed to retrieve payments history', err);
      return 0;
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    if (paymentMethod === 'PayU') {
      navigate(`/payment/checkout/${invoice.id}`);
      return;
    }

    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setPaymentError('Please enter a valid payment amount greater than 0.');
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceDue = Math.max(0, invoice.grand_total - totalPaid);
    if (parsedAmount > balanceDue + 0.01) {
      setPaymentError(`Payment amount cannot exceed the balance due of ₹${balanceDue.toFixed(2)}.`);
      return;
    }

    setIsRecordingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const payload = {
        invoice_id: invoice.id,
        payment_method: paymentMethod,
        amount_paid: parsedAmount,
        transaction_reference: transactionRef.trim() || null
      };

      await apiClient.post('/api/billing/payments', payload);
      setPaymentSuccess('Payment logged successfully.');
      setTransactionRef('');
      
      // Reload invoice and payment list
      const updatedInvoiceRes = await apiClient.get(`/api/billing/invoices/${invoice.id}`);
      const updatedInvoice = updatedInvoiceRes.data;
      setInvoice(updatedInvoice);
      await loadPaymentsAndCalculatePaid(updatedInvoice.id, updatedInvoice.grand_total);
      
      setTimeout(() => {
        setPaymentSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.response?.data?.detail || 'Failed to register payment voucher.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleQuickSettleCash = async () => {
    if (!invoice) return;

    setIsRecordingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceDue = Math.max(0, invoice.grand_total - totalPaid);

    try {
      const payload = {
        invoice_id: invoice.id,
        payment_method: 'Cash',
        amount_paid: balanceDue,
        transaction_reference: 'Cash Settlement'
      };

      await apiClient.post('/api/billing/payments', payload);
      setPaymentSuccess('Cash settlement registered successfully.');
      setTransactionRef('');
      
      const updatedInvoiceRes = await apiClient.get(`/api/billing/invoices/${invoice.id}`);
      const updatedInvoice = updatedInvoiceRes.data;
      setInvoice(updatedInvoice);
      await loadPaymentsAndCalculatePaid(updatedInvoice.id, updatedInvoice.grand_total);
      
      setTimeout(() => {
        setPaymentSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.response?.data?.detail || 'Failed to settle invoice as cash.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compiling Invoice Record...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm text-xs font-semibold text-red-700 flex items-start space-x-3">
        <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Error Loading Invoice</h4>
          <p className="mt-1">{error || 'Invoice record not found.'}</p>
          <button 
            onClick={() => navigate('/billing/dashboard')}
            className="mt-3 inline-flex items-center text-teal-600 hover:text-teal-800 font-bold underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const balanceDue = Math.max(0, invoice.grand_total - totalPaid);

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans antialiased text-slate-800">
      
      {/* Header bar (Hidden during Print) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
        <button
          onClick={() => navigate('/billing/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer font-sans border-0 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </button>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4 mr-1.5 text-slate-500" /> Print Invoice (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Inject custom print stylesheet overrides */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print-invoice-card {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Main Grid: Left is Invoice Sheet, Right is Payments Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Hospital GST Invoice Sheet */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-8 print-invoice-card print:shadow-none print:border-0">
            
            {/* Header: Hospital Logo info & Invoice Number Metadata */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 tracking-widest uppercase">HMIS Hospital Network</span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">{branch?.name || 'Multi-Branch Hospital'}</h1>
                <div className="text-[11px] text-slate-500 mt-2 space-y-1">
                  <p className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" /> {branch?.address || 'Hospital Branch Address Placeholder'}</p>
                  <p className="flex items-center"><Phone className="h-3.5 w-3.5 mr-1 text-slate-400" /> {branch?.contact_number || '+91 99999 99999'}</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  invoice.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  invoice.payment_status === 'due' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {invoice.payment_status}
                </span>
                
                <h3 className="text-sm font-mono font-bold text-slate-900 mt-3">{invoice.invoice_number}</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 font-mono">
                  Date: {new Date(invoice.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {invoice.doctor_name && (
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">
                    Dr. {invoice.doctor_name}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Demographics Panel */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 print:bg-white print:border-slate-200">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Billed Patient</span>
                <h4 className="text-sm font-bold text-slate-900 flex items-center mt-1">
                  <User className="h-4 w-4 mr-1 text-slate-400" />
                  {patient ? `${patient.first_name} ${patient.last_name}` : invoice.patient_name || 'Loading Patient...'}
                </h4>
                {patient && (
                  <div className="mt-2 space-y-1 text-slate-500 font-medium font-sans">
                    <p className="flex items-center"><Hash className="h-3.5 w-3.5 mr-1 text-slate-400" /> MRN: <span className="font-mono font-bold text-slate-700 ml-1">{patient.mrn}</span></p>
                    <p className="flex items-center"><Phone className="h-3.5 w-3.5 mr-1 text-slate-400" /> Phone: {patient.phone}</p>
                    {patient.email && <p className="flex items-center"><Mail className="h-3.5 w-3.5 mr-1 text-slate-400" /> Email: {patient.email}</p>}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Patient Profile</span>
                {patient && (
                  <div className="mt-2 space-y-1 text-slate-500 font-medium font-sans">
                    <p>Gender: <span className="text-slate-700 font-semibold">{patient.gender}</span></p>
                    <p>DOB: <span className="text-slate-700 font-semibold">{new Date(patient.dob).toLocaleDateString()}</span></p>
                    {patient.blood_group && <p>Blood Group: <span className="text-slate-700 font-semibold">{patient.blood_group}</span></p>}
                    <p className="leading-relaxed flex items-start mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 flex-shrink-0 mt-0.5" /> 
                      <span>Address: {patient.address}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Billing Breakdown</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[9px] uppercase font-bold">
                      <th className="pb-2 w-[5%] text-center">#</th>
                      <th className="pb-2 w-[40%]">Item Description</th>
                      <th className="pb-2 w-[12%] text-right">Base Rate</th>
                      <th className="pb-2 w-[8%] text-center">Qty</th>
                      <th className="pb-2 w-[10%] text-right">Discount</th>
                      <th className="pb-2 w-[10%] text-right">GST %</th>
                      <th className="pb-2 w-[15%] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => {
                      const netPrice = item.base_price * (1 - (item.discount_percentage / 100));
                      const taxableLine = netPrice * item.quantity;
                      
                      return (
                        <tr key={idx} className="border-b border-slate-100 font-sans hover:bg-slate-50/50">
                          <td className="py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 font-medium text-slate-800">{item.description}</td>
                          <td className="py-3 text-right font-mono text-slate-600">₹{item.base_price.toFixed(2)}</td>
                          <td className="py-3 text-center font-mono text-slate-600">{item.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-600">
                            {item.discount_percentage > 0 ? (
                              <span>₹{(item.base_price * item.quantity * item.discount_percentage / 100).toFixed(2)} <span className="text-[9px] text-slate-400">({item.discount_percentage}%)</span></span>
                            ) : '-'}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-600">
                            {item.gst_rate > 0 ? `${item.gst_rate}%` : '0%'}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">₹{item.line_total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotal, tax totals, discount & Grand total Summary Card */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-slate-100 pt-6">
              
              {/* Payment methods informational warning */}
              <div className="w-full md:max-w-xs text-[10px] text-slate-400 font-medium leading-relaxed italic print:hidden font-sans">
                * Dynamic Hospital GST invoice compiled under Central Board of Indirect Taxes rules. Diagnostic labs are classified as healthcare services under SAC code 9993 and default to GST exempt (0.0%).
              </div>

              {/* Math summaries card */}
              <div className="w-full md:w-80 bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-3 text-xs font-semibold print:bg-white print:border-slate-200">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax Aggregate:</span>
                  <span className="font-mono">₹{invoice.gst_total.toFixed(2)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Flat Discount:</span>
                    <span className="font-mono">-₹{invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-slate-900">₹{invoice.grand_total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Total Payments Logged:</span>
                  <span className="font-mono text-emerald-600">₹{totalPaid.toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                  <span>Balance Due:</span>
                  <span className={`font-mono ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

            </div>

            {/* Printable signatures section */}
            <div className="hidden print:grid print:grid-cols-2 print:gap-8 print:pt-16 print:text-xs">
              <div className="text-center">
                <div className="border-b border-black w-48 mx-auto h-8"></div>
                <p className="mt-2 font-bold text-black uppercase tracking-wider text-[9px]">Patient/Receiver Signature</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black w-48 mx-auto h-8"></div>
                <p className="mt-2 font-bold text-black uppercase tracking-wider text-[9px]">Authorized Desk Officer</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Payment desk and history log (Hidden during Print) */}
        <div className="space-y-6 print:hidden">
          
          {/* Action form: Collect/Record Payment */}
          {balanceDue > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <CreditCard className="h-4.5 w-4.5 text-teal-600 mr-2" /> Log Payment Receipt
              </h3>

              {paymentError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-[11px] font-semibold text-red-700 flex items-start space-x-2">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p>{paymentError}</p>
                </div>
              )}

              {paymentSuccess && (
                <div className="bg-teal-50 border-l-4 border-teal-500 p-3 rounded text-[11px] font-semibold text-teal-700 flex items-start space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <p>{paymentSuccess}</p>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                  >
                    {paymentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Received (₹)</label>
                  <div className="mt-1 relative rounded shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-mono">₹</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-3 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="Ref ID, Cheque #, UPI ID..."
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 font-semibold"
                  />
                </div>

                 <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="w-full inline-flex justify-center items-center py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0"
                >
                  {paymentMethod === 'PayU' ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-1.5" />
                      Proceed to PayU Checkout
                    </>
                  ) : isRecordingPayment ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                      Logging Transaction...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-1.5" />
                      Record Payment Voucher
                    </>
                  )}
                </button>

                {paymentMethod !== 'PayU' && (
                  <button
                    type="button"
                    onClick={handleQuickSettleCash}
                    disabled={isRecordingPayment}
                    className="w-full inline-flex justify-center items-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0 mt-2"
                  >
                    <DollarSign className="h-4 w-4 mr-1.5" />
                    Settle Full Due as Cash
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3 font-semibold text-xs text-emerald-800 shadow-sm">
              <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
              <div>
                <h4 className="font-bold text-sm">Invoice Fully Settled</h4>
                <p className="mt-1 text-emerald-600">The entire balance of this invoice has been fully paid. No further payments are required.</p>
              </div>
            </div>
          )}

          {/* History ledger card listing logged transactions */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Receipt className="h-4.5 w-4.5 text-teal-600 mr-2" /> Receipt Ledger
            </h3>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6 font-medium">No payments received for this invoice yet.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div key={p.id || idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between items-start font-sans">
                      <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] uppercase tracking-wide text-slate-500">
                        {p.payment_method}
                      </span>
                      <span className="font-mono text-emerald-700 font-bold">
                        +₹{p.amount_paid.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 font-sans">
                      <p>Date: {new Date(p.created_at).toLocaleString()}</p>
                      {p.transaction_reference && <p className="font-mono truncate">Ref: {p.transaction_reference}</p>}
                      <p>Clerk ID: <span className="font-mono">{p.created_by}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default ViewInvoice;
