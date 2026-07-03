import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  DollarSign, Filter, CheckCircle, Clock, CreditCard, Users, ChevronDown, Plus, X, Trash2, ShieldAlert
} from 'lucide-react';

interface ReferralTransaction {
  id: string;
  invoice_id: string;
  referring_doctor_id: string;
  referring_doctor_name: string;
  visit_id: string | null;
  commission_amount: number;
  payout_status: string;
  paid_at: string | null;
  created_at: string;
}

interface DoctorSummary {
  referring_doctor_id: string;
  referring_doctor_name: string;
  total_pending: number;
  total_paid: number;
  pending_count: number;
  paid_count: number;
}

interface CommissionRule {
  department_or_service: string;
  percentage: number;
}

interface ReferringDoctor {
  id: string;
  name: string;
  hospital_name?: string;
  phone?: string;
  specialty?: string;
  commission_rules: CommissionRule[];
  is_active: boolean;
}

const ReferralLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [summaries, setSummaries] = useState<DoctorSummary[]>([]);
  const [doctors, setDoctors] = useState<ReferringDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'doctors'>('summary');

  // Filters
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Payout state
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());
  const [payoutRef, setPayoutRef] = useState('');
  const [settling, setSettling] = useState(false);

  // Doctors Master state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docHospital, setDocHospital] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  
  // Commission rules input states
  const [ruleLab, setRuleLab] = useState('10');
  const [ruleRadiology, setRuleRadiology] = useState('10');
  const [ruleConsultation, setRuleConsultation] = useState('10');
  const [ruleOther, setRuleOther] = useState('0');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnRes, sumRes, docRes] = await Promise.all([
        apiClient.get('/api/referrals/transactions', {
          params: {
            ...(filterDoctor ? { referring_doctor_id: filterDoctor } : {}),
            ...(filterStatus ? { payout_status: filterStatus } : {})
          }
        }),
        apiClient.get('/api/referrals/transactions/summary'),
        apiClient.get('/api/referrals/doctors')
      ]);
      setTransactions(txnRes.data);
      setSummaries(sumRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDoctor, filterStatus]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedTxns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTxns(next);
  };

  const selectAllPending = () => {
    const pending = transactions.filter(t => t.payout_status === 'pending');
    if (filterDoctor) {
      setSelectedTxns(new Set(pending.filter(t => t.referring_doctor_id === filterDoctor).map(t => t.id)));
    } else {
      setSelectedTxns(new Set(pending.map(t => t.id)));
    }
  };

  const handlePayout = async () => {
    if (selectedTxns.size === 0) return;

    // Group by referring doctor
    const grouped: Record<string, string[]> = {};
    for (const txn of transactions) {
      if (selectedTxns.has(txn.id)) {
        if (!grouped[txn.referring_doctor_id]) grouped[txn.referring_doctor_id] = [];
        grouped[txn.referring_doctor_id].push(txn.id);
      }
    }

    setSettling(true);
    try {
      for (const [docId, txnIds] of Object.entries(grouped)) {
        await apiClient.post('/api/referrals/payouts', {
          referring_doctor_id: docId,
          transaction_ids: txnIds,
          payment_reference: payoutRef || null
        });
      }
      setSelectedTxns(new Set());
      setPayoutRef('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to settle payouts');
    } finally {
      setSettling(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) {
      alert('Doctor Name is required');
      return;
    }

    const rules: CommissionRule[] = [
      { department_or_service: 'Lab', percentage: parseFloat(ruleLab) || 0 },
      { department_or_service: 'Radiology', percentage: parseFloat(ruleRadiology) || 0 },
      { department_or_service: 'Consultation', percentage: parseFloat(ruleConsultation) || 0 },
      { department_or_service: 'Other', percentage: parseFloat(ruleOther) || 0 }
    ];

    try {
      await apiClient.post('/api/referrals/doctors', {
        name: docName,
        hospital_name: docHospital || null,
        phone: docPhone || null,
        specialty: docSpecialty || null,
        commission_rules: rules
      });
      setShowDoctorModal(false);
      resetDoctorForm();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create referring doctor');
    }
  };

  const resetDoctorForm = () => {
    setDocName(''); setDocHospital(''); setDocPhone(''); setDocSpecialty('');
    setRuleLab('10'); setRuleRadiology('10'); setRuleConsultation('10'); setRuleOther('0');
  };

  const handleToggleActive = async (doctor: ReferringDoctor) => {
    try {
      await apiClient.put(`/api/referrals/doctors/${doctor.id}`, {
        is_active: !doctor.is_active
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  const totalPendingAll = summaries.reduce((s, d) => s + d.total_pending, 0);
  const totalPaidAll = summaries.reduce((s, d) => s + d.total_paid, 0);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            Referral Commission Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Track and settle referring doctor commission payouts, configure master rules, and monitor conversions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Referring Doctor
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 block uppercase">Total Pending Commissions</p>
              <p className="text-lg font-bold text-amber-700 mt-0.5">{formatCurrency(totalPendingAll)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 block uppercase">Total Settled Commissions</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(totalPaidAll)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 block uppercase">Registered Referral Partners</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{doctors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 max-w-sm text-xs font-bold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
            activeTab === 'summary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Partner Summaries
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
            activeTab === 'transactions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Commission Transactions
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
            activeTab === 'doctors' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Referring Partners Master
        </button>
      </div>

      {/* TAB 1: SUMMARIES */}
      {activeTab === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-medium text-slate-750 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <th className="px-6 py-3.5">Referring Doctor</th>
                <th className="px-6 py-3.5 text-right">Pending Commissions</th>
                <th className="px-6 py-3.5 text-center">Pending Txns</th>
                <th className="px-6 py-3.5 text-right">Settled Commissions</th>
                <th className="px-6 py-3.5 text-center">Settled Txns</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 italic font-semibold">Loading summaries...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 italic font-semibold">No referral commissions recorded yet.</td></tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.referring_doctor_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{s.referring_doctor_name}</td>
                    <td className="px-6 py-4 text-right font-bold text-amber-700">{formatCurrency(s.total_pending)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded text-[10px] font-extrabold border border-amber-100">{s.pending_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">{formatCurrency(s.total_paid)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded text-[10px] font-extrabold border border-emerald-100">{s.paid_count}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2 bg-white border border-slate-350 rounded-lg px-2.5 py-1.5">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              >
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-350 rounded-lg px-2.5 py-1.5">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-3 font-bold">
              <button
                onClick={selectAllPending}
                className="text-xs text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                Select All Pending
              </button>
              {selectedTxns.size > 0 && (
                <>
                  <input
                    type="text"
                    placeholder="Payment Ref (optional)"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none w-48 text-xs font-semibold"
                  />
                  <button
                    onClick={handlePayout}
                    disabled={settling}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {settling ? 'Settling...' : `Settle ${selectedTxns.size} Txns`}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-medium text-slate-750 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) selectAllPending();
                        else setSelectedTxns(new Set());
                      }}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Referring Doctor</th>
                  <th className="px-4 py-3">Invoice Reference</th>
                  <th className="px-4 py-3 text-right">Commission Amount</th>
                  <th className="px-4 py-3 text-center">Payout Status</th>
                  <th className="px-4 py-3">Settlement Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic font-semibold">Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic font-semibold">No referral transactions matching criteria.</td></tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {txn.payout_status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedTxns.has(txn.id)}
                            onChange={() => toggleSelect(txn.id)}
                            className="rounded border-slate-300"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{formatDate(txn.created_at)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{txn.referring_doctor_name}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">ID: {txn.invoice_id.slice(-8)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(txn.commission_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          txn.payout_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                        }`}>
                          {txn.payout_status === 'paid' ? 'Settled' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                        {txn.paid_at ? formatDate(txn.paid_at) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REFERRING PARTNERS MASTER */}
      {activeTab === 'doctors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-medium text-slate-750 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <th className="px-6 py-3.5">Doctor Name</th>
                <th className="px-6 py-3.5">Specialty</th>
                <th className="px-6 py-3.5">Hospital / Clinic</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Commission Rules Config</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic font-semibold">Loading partners directory...</td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic font-semibold">No referring doctors master registered.</td></tr>
              ) : (
                doctors.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{doc.name}</td>
                    <td className="px-6 py-4 text-slate-650 font-semibold">{doc.specialty || 'General Practitioner'}</td>
                    <td className="px-6 py-4 text-slate-650">{doc.hospital_name || 'Independent Clinic'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">{doc.phone || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.commission_rules.map((r, idx) => (
                          <span 
                            key={idx}
                            className="inline-block bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold"
                          >
                            {r.department_or_service}: {r.percentage}%
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        doc.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {doc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(doc)}
                        className={`text-[10px] font-bold px-2 py-1 border rounded cursor-pointer ${
                          doc.is_active 
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50' 
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {doc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE DOCTOR MODAL */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Register Referring Partner Doctor</h3>
              <button 
                onClick={() => { setShowDoctorModal(false); resetDoctorForm(); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Name"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Hospital / Clinic</label>
                  <input
                    type="text"
                    placeholder="Clinic/Hosp Name"
                    value={docHospital}
                    onChange={(e) => setDocHospital(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiologist"
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Commission Rules list */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Commission Rules percentage (%)</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block">Lab department</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ruleLab}
                      onChange={(e) => setRuleLab(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block">Radiology department</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ruleRadiology}
                      onChange={(e) => setRuleRadiology(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block">Consultations</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ruleConsultation}
                      onChange={(e) => setRuleConsultation(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase block">Other items</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ruleOther}
                      onChange={(e) => setRuleOther(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setShowDoctorModal(false); resetDoctorForm(); }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-705 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer"
                >
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReferralLedger;
