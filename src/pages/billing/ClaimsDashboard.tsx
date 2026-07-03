import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  Loader2, Plus, ShieldCheck, CheckCircle2, AlertCircle, Clock, XCircle, FileSpreadsheet, Search, RefreshCw 
} from 'lucide-react';

interface TPAProvider {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface PatientPolicy {
  id: string;
  insurance_company: string;
  policy_number: string;
  card_number: string;
  sum_insured: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  grand_total: number;
  payment_status: string;
}

interface Claim {
  id: string;
  invoice_id: string;
  policy_id: string;
  tpa_id: string;
  tpa_name?: string;
  pre_auth_amount: number;
  approved_amount: number;
  co_pay_amount: number;
  status: string; // draft, pre_auth_pending, approved, settled, rejected
  created_at: string;
}

export const ClaimsDashboard: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal control
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  
  // Submit Claim state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tpas, setTpas] = useState<TPAProvider[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [patientPolicies, setPatientPolicies] = useState<PatientPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [selectedTpaId, setSelectedTpaId] = useState('');
  const [preAuthAmount, setPreAuthAmount] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Approve Claim state
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [isApprovingClaim, setIsApprovingClaim] = useState(false);

  // Filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  useEffect(() => {
    fetchClaims();
    fetchTpas();
    fetchInvoices();
  }, []);

  const fetchClaims = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/tpa/claims');
      setClaims(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load insurance claims logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTpas = async () => {
    try {
      const res = await apiClient.get('/api/tpa/providers');
      setTpas(res.data.filter((p: TPAProvider) => p.is_active));
    } catch (err) {
      console.error('Error fetching TPAs:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await apiClient.get('/api/billing/invoices');
      // Only keep invoices that are unpaid or due
      setInvoices(res.data.filter((inv: Invoice) => inv.payment_status !== 'paid'));
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  // Fetch policies when invoice is selected
  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoice(null);
      setPatientPolicies([]);
      return;
    }
    const inv = invoices.find(i => i.id === selectedInvoiceId) || null;
    setSelectedInvoice(inv);
    
    if (inv) {
      setPreAuthAmount(inv.grand_total.toString());
      apiClient.get(`/api/tpa/policies/patient/${inv.patient_id}`)
        .then(res => {
          setPatientPolicies(res.data);
          if (res.data.length > 0) {
            setSelectedPolicyId(res.data[0].id);
          } else {
            setSelectedPolicyId('');
          }
        })
        .catch(err => {
          console.error('Error fetching policies for patient:', err);
          setPatientPolicies([]);
        });
    }
  }, [selectedInvoiceId, invoices]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !selectedPolicyId || !selectedTpaId || !preAuthAmount) return;
    setIsSubmittingClaim(true);
    setError(null);
    try {
      const payload = {
        invoice_id: selectedInvoiceId,
        policy_id: selectedPolicyId,
        tpa_id: selectedTpaId,
        pre_auth_amount: parseFloat(preAuthAmount)
      };
      await apiClient.post('/api/tpa/claims', payload);
      setIsSubmitModalOpen(false);
      
      // Reset form
      setSelectedInvoiceId('');
      setSelectedTpaId('');
      setPreAuthAmount('');
      
      // Refresh claims & invoices
      fetchClaims();
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit pre-auth request.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleApproveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !approvedAmount) return;
    setIsApprovingClaim(true);
    setError(null);
    try {
      await apiClient.put(`/api/tpa/claims/${selectedClaim.id}/approve`, {
        approved_amount: parseFloat(approvedAmount)
      });
      setIsApproveModalOpen(false);
      setSelectedClaim(null);
      setApprovedAmount('');
      
      // Refresh
      fetchClaims();
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process claim approval.');
    } finally {
      setIsApprovingClaim(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pre_auth_pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-250">
            <Clock className="h-3 w-3 mr-1" /> Pre-Auth Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </span>
        );
      case 'settled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-550/10 text-teal-700 border border-teal-550/20">
            <ShieldCheck className="h-3 w-3 mr-1" /> Settled
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Find invoice details by ID
  const getInvoiceNumber = (invoiceId: string) => {
    // Check local invoices state first, else default to short ID
    const found = invoices.find(i => i.id === invoiceId);
    if (found) return found.invoice_number;
    return `INV-${invoiceId.slice(-6).toUpperCase()}`;
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-6 w-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">TPA & Insurance Claims Dashboard</h2>
            <p className="text-xs text-slate-500 font-semibold">Track pre-authorization status, approve co-pay splits, and manage cashless hospital billing.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchClaims}
            className="p-2 border border-slate-350 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all inline-flex items-center"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              fetchInvoices();
              setIsSubmitModalOpen(true);
            }}
            className="inline-flex items-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Submit Pre-Auth Request
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Claims Grid Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-650">Active Insurance Claims Register</h4>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">{claims.length} Claims Total</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Invoice Number</th>
                  <th className="px-6 py-3 text-left">TPA Partner</th>
                  <th className="px-6 py-3 text-right">Requested Pre-Auth</th>
                  <th className="px-6 py-3 text-right">Approved Amt</th>
                  <th className="px-6 py-3 text-right">Patient Co-Pay</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-xs">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No active insurance claims recorded. Click "Submit Pre-Auth Request" to initiate.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-semibold text-slate-800 font-mono">
                        {getInvoiceNumber(claim.invoice_id)}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">
                        {claim.tpa_name || 'TPA Partner'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        ₹{claim.pre_auth_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-teal-700">
                        ₹{claim.approved_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-700">
                        ₹{claim.co_pay_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(claim.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {claim.status === 'pre_auth_pending' && (
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setApprovedAmount(claim.pre_auth_amount.toString());
                              setIsApproveModalOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            Approve Settlement
                          </button>
                        )}
                        {claim.status === 'approved' && (
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Pre-Auth Request Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Initiate Pre-Authorization Claim</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Unpaid/Due Invoice</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Choose Patient Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.patient_name} (Total: ₹{inv.grand_total.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-550">Patient Name:</span>
                      <span className="font-bold text-slate-800">{selectedInvoice.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-550">Invoice Balance Due:</span>
                      <span className="font-bold text-slate-800">₹{selectedInvoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {patientPolicies.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No Registered Policies Found</p>
                        <p className="mt-0.5 text-[11px]">Go to the Patient Registry details page under reception to link an active policy card first.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Coverage Policy Card</label>
                      <select
                        required
                        value={selectedPolicyId}
                        onChange={(e) => setSelectedPolicyId(e.target.value)}
                        className="mt-1.5 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        {patientPolicies.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.insurance_company} (No: {p.policy_number} / Limit: ₹{p.sum_insured.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">TPA Partner Provider</label>
                    <select
                      required
                      value={selectedTpaId}
                      onChange={(e) => setSelectedTpaId(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="">-- Choose TPA Provider --</option>
                      {tpas.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested Pre-Auth Amount (INR)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={preAuthAmount}
                      onChange={(e) => setPreAuthAmount(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. 15000"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim || !selectedInvoiceId || !selectedPolicyId || !selectedTpaId || !preAuthAmount}
                  className="px-4 py-2 bg-teal-650 hover:bg-teal-700 bg-teal-650 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center"
                >
                  {isSubmittingClaim && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />}
                  Submit Claim Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Claim Settlement Modal */}
      {isApproveModalOpen && selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Approve & Settle Claim</h3>
              <button onClick={() => { setIsApproveModalOpen(false); setSelectedClaim(null); }} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleApproveClaim} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Invoice:</span>
                  <span className="font-bold text-slate-800 font-mono">{getInvoiceNumber(selectedClaim.invoice_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Pre-Auth Amount:</span>
                  <span className="font-bold text-slate-800">₹{selectedClaim.pre_auth_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Settled & Approved Amount (INR)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={selectedClaim.pre_auth_amount}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Approved Claim Total"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Remaining amount will automatically become patient copay dues.</span>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsApproveModalOpen(false); setSelectedClaim(null); }}
                  className="px-4 py-2 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApprovingClaim || !approvedAmount}
                  className="px-4 py-2 bg-teal-650 hover:bg-teal-700 bg-teal-650 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center"
                >
                  {isApprovingClaim && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />}
                  Confirm Approval & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClaimsDashboard;
