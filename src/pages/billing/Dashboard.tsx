import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  CreditCard, Search, CheckCircle, Clock, Plus, FileText, 
  Loader2, AlertCircle, RefreshCw, Eye, DollarSign, ArrowDownCircle, ArrowUpCircle, Printer, HelpCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  subtotal: number;
  gst_total: number;
  grand_total: number;
  payment_status: 'unpaid' | 'paid' | 'due';
  created_at: string;
}

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
  advance_balance?: number;
}

interface LedgerEntry {
  date: string;
  type: 'debit' | 'credit';
  entry_type: string;
  description: string;
  amount: number;
  running_balance: number;
  reference_id: string;
}

interface LedgerData {
  patient: {
    name: string;
    mrn: string;
    advance_balance: number;
  };
  entries: LedgerEntry[];
  net_due: number;
}

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Dashboard Level Tab Selection
  const [deskTab, setDeskTab] = useState<'invoices' | 'advance' | 'ledger'>('invoices');
  
  // Tab 1: Invoices states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  
  // Tab 2: Advance Payments states
  const [patientQuery, setPatientQuery] = useState('');
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Action Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Cash');
  const [depositRef, setDepositRef] = useState('');
  
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [refundReason, setRefundReason] = useState('');
  const [refundInvoiceId, setRefundInvoiceId] = useState('');
  
  // Tab 3: Ledger states
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSuggestions, setLedgerSuggestions] = useState<Patient[]>([]);
  const [ledgerPatient, setLedgerPatient] = useState<Patient | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // General Statuses
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (deskTab === 'invoices') {
      fetchInvoices();
    }
  }, [deskTab, invoiceStatusFilter]);

  // Tab 1 logic: Fetch Invoices
  const exportInvoicesToCSV = () => {
    if (invoices.length === 0) return;
    const headers = ['Invoice Number', 'Patient Name', 'Subtotal (₹)', 'GST (₹)', 'Grand Total (₹)', 'Payment Status', 'Created At'];
    const rows = invoices.map(inv => [
      inv.invoice_number,
      inv.patient_name,
      inv.subtotal.toFixed(2),
      inv.gst_total.toFixed(2),
      inv.grand_total.toFixed(2),
      inv.payment_status,
      new Date(inv.created_at).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (invoiceStatusFilter === 'paid') {
        params.payment_status = 'paid';
      }
      const res = await apiClient.get('/api/billing/invoices', { params });
      let invoiceData = res.data;
      if (invoiceStatusFilter === 'unpaid') {
        invoiceData = invoiceData.filter((i: Invoice) => i.payment_status === 'unpaid' || i.payment_status === 'due');
      }
      setInvoices(invoiceData);
    } catch (err: any) {
      setError('Failed to retrieve invoices catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tab 2 logic: Search Patient for Advance Payment
  const searchPatientsForAdvance = async (q: string) => {
    if (q.trim().length < 2) {
      setPatientsList([]);
      return;
    }
    setIsSearchingPatients(true);
    try {
      const res = await apiClient.get('/api/patients', { params: { q } });
      setPatientsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // Debounce hook for patient search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (deskTab === 'advance') {
        searchPatientsForAdvance(patientQuery);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [patientQuery]);

  // Tab 3 logic: Search Patient for Ledger
  const searchPatientsForLedger = async (q: string) => {
    if (q.trim().length < 2) {
      setLedgerSuggestions([]);
      return;
    }
    try {
      const res = await apiClient.get('/api/patients', { params: { q } });
      setLedgerSuggestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (deskTab === 'ledger') {
        searchPatientsForLedger(ledgerSearch);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [ledgerSearch]);

  const loadPatientLedger = async (patient: Patient) => {
    setLedgerPatient(patient);
    setLedgerSearch('');
    setLedgerSuggestions([]);
    setIsLoadingLedger(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/billing/patients/${patient.id}/ledger`);
      setLedgerData(res.data);
    } catch (e: any) {
      setError('Failed to fetch patient financial ledger records.');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Form handlers
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post('/api/billing/advance-payment', {
        patient_id: selectedPatient.id,
        amount: parseFloat(depositAmount),
        payment_method: depositMethod,
        transaction_reference: depositRef || null
      });
      setSuccess('Advance payment deposit recorded successfully');
      setDepositAmount('');
      setDepositRef('');
      setShowDepositModal(false);
      // Reload details
      searchPatientsForAdvance(patientQuery);
      setSelectedPatient(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }
    if (!refundReason) {
      alert('Refund reason is required for financial audit trail');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post('/api/billing/refunds', {
        patient_id: selectedPatient.id,
        invoice_id: refundInvoiceId || null,
        amount: parseFloat(refundAmount),
        payment_method: refundMethod,
        reason: refundReason
      });
      setSuccess('Refund transaction registered successfully');
      setRefundAmount('');
      setRefundReason('');
      setRefundInvoiceId('');
      setShowRefundModal(false);
      // Reload details
      searchPatientsForAdvance(patientQuery);
      setSelectedPatient(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Refund failed');
    } finally {
      setIsLoading(false);
    }
  };

  const printLedger = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(i => 
    i.patient_name.toLowerCase().includes(invoiceQuery.toLowerCase()) ||
    i.invoice_number.toLowerCase().includes(invoiceQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <CreditCard className="h-6 w-6 text-teal-600 mr-2" /> Hospital Billing & Invoice Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage patient accounts, issue refunds, collect advances, and inspect clinical ledgers.</p>
        </div>
        <div className="flex space-x-2 no-print">
          <button
            data-tour="billing-compile"
            onClick={() => navigate('/billing/invoice/new')}
            className="inline-flex items-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer font-sans"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Generate Invoice
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700 no-print">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-teal-700 no-print">
          <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Desk Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold no-print">
        <button
          onClick={() => setDeskTab('invoices')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
            deskTab === 'invoices' 
              ? 'border-teal-600 text-teal-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Invoices Registry
        </button>
        <button
          onClick={() => setDeskTab('advance')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
            deskTab === 'advance' 
              ? 'border-teal-600 text-teal-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Advance Payments Desk
        </button>
        <button
          onClick={() => setDeskTab('ledger')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
            deskTab === 'ledger' 
              ? 'border-teal-600 text-teal-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Patient Financial Ledger
        </button>
      </div>

      {/* TAB 1: INVOICES REGISTRY */}
      {deskTab === 'invoices' && (
        <div data-tour="billing-queue" className="space-y-6 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex border-b border-slate-100 text-[11px] font-bold items-center space-x-2">
              <button
                onClick={() => setInvoiceStatusFilter('all')}
                className={`pb-2 px-3 border-b-2 cursor-pointer ${invoiceStatusFilter === 'all' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}
              >
                All Invoices
              </button>
              <button
                onClick={() => setInvoiceStatusFilter('unpaid')}
                className={`pb-2 px-3 border-b-2 cursor-pointer ${invoiceStatusFilter === 'unpaid' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}
              >
                Unpaid & Dues
              </button>
              <button
                onClick={() => setInvoiceStatusFilter('paid')}
                className={`pb-2 px-3 border-b-2 cursor-pointer ${invoiceStatusFilter === 'paid' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}
              >
                Paid Invoices
              </button>
              <button
                onClick={exportInvoicesToCSV}
                disabled={invoices.length === 0}
                className="pb-2 px-3 text-slate-500 hover:text-slate-700 font-bold inline-flex items-center disabled:opacity-50 cursor-pointer text-[10px]"
              >
                Export CSV
              </button>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, invoice number..."
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">
                No invoices registered under the selected status.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-medium text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-3.5">Invoice Date</th>
                    <th className="px-6 py-3.5">Invoice Number</th>
                    <th className="px-6 py-3.5">Patient Demographics</th>
                    <th className="px-6 py-3.5">Grand Total</th>
                    <th className="px-6 py-3.5">Payment Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {new Date(invoice.created_at).toLocaleDateString()}<br/>
                        {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{invoice.patient_name}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        ₹{invoice.grand_total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          invoice.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          invoice.payment_status === 'due' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {invoice.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/billing/invoice/view/${invoice.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-bold cursor-pointer font-sans"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" /> View & Transact
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCE PAYMENTS DESK */}
      {deskTab === 'advance' && (
        <div className="space-y-6 no-print">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Advance Account Lookup</h3>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by MRN, Name or Phone..."
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-semibold"
              />
              {isSearchingPatients && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="animate-spin h-4.5 w-4.5 text-teal-600" />
                </div>
              )}
            </div>

            {patientsList.length > 0 ? (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs font-semibold">
                {patientsList.map(pat => (
                  <div key={pat.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800">{pat.first_name} {pat.last_name}</h4>
                      <p className="text-slate-400 font-mono text-[10px]">MRN: {pat.mrn} | Phone: {pat.phone}</p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Advance Balance</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">₹{(pat.advance_balance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => { setSelectedPatient(pat); setShowDepositModal(true); }}
                          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded font-bold cursor-pointer inline-flex items-center"
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> Deposit
                        </button>
                        <button
                          onClick={() => { setSelectedPatient(pat); setShowRefundModal(true); }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold cursor-pointer inline-flex items-center"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Refund
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : patientQuery.length > 1 && !isSearchingPatients && (
              <p className="text-xs text-slate-400 italic font-semibold">No matching patient profiles found.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PATIENT FINANCIAL LEDGER */}
      {deskTab === 'ledger' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4 no-print">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Generate Audit Ledger Statement</h3>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by MRN or Name..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-semibold"
              />
            </div>

            {ledgerSuggestions.length > 0 && (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs font-semibold">
                {ledgerSuggestions.map(pat => (
                  <button
                    key={pat.id}
                    onClick={() => loadPatientLedger(pat)}
                    className="w-full text-left p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer font-sans"
                  >
                    <span>{pat.first_name} {pat.last_name}</span>
                    <span className="text-slate-400 font-mono font-bold">{pat.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoadingLedger ? (
            <div className="flex justify-center py-16 no-print">
              <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            </div>
          ) : ledgerData ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6 print-clean font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Patient Statement of Account</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Date Compiled: {new Date().toLocaleDateString()}</p>
                </div>
                <button
                  onClick={printLedger}
                  className="no-print inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer font-sans"
                >
                  <Printer className="h-4 w-4 mr-1 text-slate-400" /> Print Statement
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50 rounded-xl p-4 text-xs font-semibold text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Patient Account</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{ledgerData.patient.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">MRN Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{ledgerData.patient.mrn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Advance Wallet Balance</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block text-teal-600">
                    ₹{ledgerData.patient.advance_balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-xs font-medium text-slate-700 border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Transaction Details</th>
                    <th className="py-2.5 text-right">Debit (₹)</th>
                    <th className="py-2.5 text-right">Credit (₹)</th>
                    <th className="py-2.5 text-right">Running Due (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.entries.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 font-mono text-slate-500">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-800 block">{entry.entry_type}</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{entry.description}</span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-700">
                        {entry.type === 'debit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-700">
                        {entry.type === 'credit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800">
                        ₹{entry.running_balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 border-t border-slate-200 text-xs font-bold text-slate-800 text-right">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Aggregate Outstanding Balance Due</span>
                  <span className={`text-lg font-bold ${ledgerData.net_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{ledgerData.net_due.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : ledgerPatient && (
            <div className="p-8 text-center text-slate-400 text-xs italic font-semibold">No transaction ledger recorded for this patient.</div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showDepositModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <form onSubmit={handleDeposit} className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 font-sans">
            <h3 className="text-sm font-bold text-slate-800">Collect Advance Deposit</h3>
            <p className="text-xs text-slate-500">Patient: <span className="font-bold text-slate-700">{selectedPatient.first_name} {selectedPatient.last_name}</span></p>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Deposit Amount (INR)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Mode</label>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Ref # (Optional)</label>
              <input
                type="text"
                value={depositRef}
                onChange={(e) => setDepositRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer font-sans"
              >
                Record Deposit
              </button>
            </div>
          </form>
        </div>
      )}

      {showRefundModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <form onSubmit={handleRefund} className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 font-sans">
            <h3 className="text-sm font-bold text-slate-800 text-rose-700">Issue Refund Transaction</h3>
            <p className="text-xs text-slate-500">Patient: <span className="font-bold text-slate-700">{selectedPatient.first_name} {selectedPatient.last_name}</span></p>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Refund Amount (INR)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Link ID (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank to refund wallet balance"
                value={refundInvoiceId}
                onChange={(e) => setRefundInvoiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Audit Reason</label>
              <input
                type="text"
                required
                placeholder="Reason for refund record"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer font-sans"
              >
                Confirm Refund
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default BillingDashboard;
