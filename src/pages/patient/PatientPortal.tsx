import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  User, Activity, Calendar, FileText, CreditCard, Star, 
  MessageSquare, Loader2, ArrowRight, ShieldCheck, Download, Award, AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Visit {
  id: string;
  visit_date: string;
  status: string;
  doctor_name: string;
  chief_complaint?: string;
  soap_notes?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  prescriptions?: Array<{
    medicine_name: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }>;
}

interface Invoice {
  id: string;
  invoice_number: string;
  grand_total: number;
  payment_status: 'unpaid' | 'paid' | 'due';
  created_at: string;
  items: Array<{
    description: string;
    line_total: number;
  }>;
}

interface LabOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  doctor_name: string;
  items: Array<{
    test_name: string;
  }>;
  results_summary?: string;
}

interface RadiologyOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  doctor_name: string;
  test_name: string;
  results_url?: string;
}

interface PatientPortalData {
  profile: {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    gender: string;
    dob: string;
    blood_group?: string;
    address: string;
  };
  visits: Visit[];
  invoices: Invoice[];
  labs: LabOrder[];
  radiology: RadiologyOrder[];
}

export const PatientPortal: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PatientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'reports' | 'invoices' | 'feedback'>('overview');

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('clinical_care');
  const [comments, setComments] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/patients/portal/dashboard-data');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load patient portal dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(false);

    try {
      await apiClient.post('/api/portal/feedback', {
        rating,
        category: feedbackCategory,
        comments: comments.trim(),
      });
      setFeedbackSuccess(true);
      setComments('');
      setRating(5);
    } catch (err: any) {
      console.error(err);
      setFeedbackError(err.response?.data?.detail || 'Failed to submit feedback survey.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto font-sans p-4 animate-pulse">
        {/* Banner Skeleton */}
        <div className="bg-slate-200 rounded-2xl h-36 w-full" />
        {/* Tab Selector Skeleton */}
        <div className="flex space-x-6 border-b border-slate-200 pb-3 mt-4">
          <div className="h-6 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-24 bg-slate-200 rounded" />
        </div>
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/2" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border-l-4 border-rose-500 rounded-2xl shadow-sm text-xs font-semibold text-rose-700">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-rose-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Failed to Load Portal</h4>
            <p className="mt-1">We couldn't resolve your patient records. Please verify login credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const { profile, visits, invoices, labs, radiology } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans antialiased text-slate-800">
      {/* Premium Welcome Header Card */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10">
          <Award className="h-64 w-64" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold tracking-widest uppercase rounded-full">
              Patient Self-Service Portal
            </span>
            <h1 className="text-2xl font-black tracking-tight">Welcome, {profile.first_name} {profile.last_name}!</h1>
            <p className="text-teal-200 text-xs font-medium">Manage your medical records, check invoices, and view diagnostic updates online.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 z-10 text-xs space-y-1 font-mono">
            <p><span className="text-teal-300 font-bold">MRN:</span> {profile.mrn}</p>
            <p><span className="text-teal-300 font-bold">Blood Group:</span> {profile.blood_group || 'N/A'}</p>
            <p><span className="text-teal-300 font-bold">Gender:</span> {profile.gender}</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-6 text-xs font-bold uppercase tracking-wider text-slate-500">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 cursor-pointer border-0 bg-transparent flex items-center space-x-1.5 focus:outline-none transition-all ${
            activeTab === 'overview' ? 'border-b-2 border-teal-600 text-teal-700 font-black' : 'hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile & Vitals</span>
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`pb-3 cursor-pointer border-0 bg-transparent flex items-center space-x-1.5 focus:outline-none transition-all ${
            activeTab === 'visits' ? 'border-b-2 border-teal-600 text-teal-700 font-black' : 'hover:text-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Visits History ({visits.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 cursor-pointer border-0 bg-transparent flex items-center space-x-1.5 focus:outline-none transition-all ${
            activeTab === 'reports' ? 'border-b-2 border-teal-600 text-teal-700 font-black' : 'hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Diagnostics & Reports ({labs.length + radiology.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 cursor-pointer border-0 bg-transparent flex items-center space-x-1.5 focus:outline-none transition-all ${
            activeTab === 'invoices' ? 'border-b-2 border-teal-600 text-teal-700 font-black' : 'hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Invoices & Payments ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 cursor-pointer border-0 bg-transparent flex items-center space-x-1.5 focus:outline-none transition-all ${
            activeTab === 'feedback' ? 'border-b-2 border-teal-600 text-teal-700 font-black' : 'hover:text-slate-800'
          }`}
        >
          <Star className="h-4 w-4" />
          <span>Rate Us / Feedback</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
                <User className="h-4.5 w-4.5 text-teal-600 mr-2" /> Demographics Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Full Name</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{profile.first_name} {profile.last_name}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Number</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{profile.phone}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{profile.email || 'None Registered'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{new Date(profile.dob).toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Residential Address</p>
                  <p className="text-slate-800 font-bold text-xs mt-0.5 leading-relaxed">{profile.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
                <Activity className="h-4.5 w-4.5 text-teal-600 mr-2" /> Vitals Check Summary
              </h3>
              {visits.length > 0 ? (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100/50">
                    <p className="text-[10px] text-teal-800 font-black uppercase tracking-wider mb-2">Latest Visit: {visits[0].visit_date}</p>
                    <p className="text-slate-600">Consulting: <span className="text-slate-800 font-bold">{visits[0].doctor_name}</span></p>
                    <p className="text-slate-600 mt-1">Status: <span className="capitalize text-teal-700 font-bold">{visits[0].status}</span></p>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed italic">
                    Vitals are recorded at the triage desk before clinical consultations. Visit the triage station upon arrival.
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-12">No active clinic visits recorded.</p>
              )}
            </div>
          </div>
        )}

        {/* VISITS HISTORY PANEL */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            {visits.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic">
                No past consultations recorded for this profile.
              </div>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{visit.doctor_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{visit.visit_date}</p>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 uppercase rounded-full">
                      {visit.status}
                    </span>
                  </div>

                  {visit.chief_complaint && (
                    <div className="text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Chief Complaint</span>
                      <p className="text-slate-800 font-semibold">{visit.chief_complaint}</p>
                    </div>
                  )}

                  {visit.soap_notes && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {visit.soap_notes.subjective && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Symptoms / Notes</span>
                          <p className="text-slate-700 font-semibold">{visit.soap_notes.subjective}</p>
                        </div>
                      )}
                      {visit.soap_notes.plan && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Treatment Plan</span>
                          <p className="text-slate-700 font-semibold">{visit.soap_notes.plan}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {visit.prescriptions && visit.prescriptions.length > 0 && (
                    <div className="text-xs bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2.5">Prescriptions</span>
                      <div className="divide-y divide-slate-200">
                        {visit.prescriptions.map((p, idx) => (
                          <div key={idx} className="py-2.5 flex justify-between items-start font-semibold">
                            <div>
                              <p className="text-slate-800 font-bold">{p.medicine_name}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">Instructions: {p.instructions || 'As directed'}</p>
                            </div>
                            <div className="text-right text-[10px]">
                              <p className="text-slate-600 font-bold">{p.dosage}</p>
                              <p className="text-slate-400 mt-0.5">{p.duration}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* DIAGNOSTICS & REPORTS PANEL */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lab Investigations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
                <FileText className="h-4.5 w-4.5 text-teal-600 mr-2" /> Lab Reports
              </h3>
              {labs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-12 text-center">No lab test logs found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {labs.map((order) => (
                    <div key={order.id} className="py-3.5 space-y-2">
                      <div className="flex justify-between items-start text-xs font-semibold">
                        <div>
                          <p className="font-bold text-slate-800">{order.order_number}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{order.created_at}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          order.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] font-medium text-slate-600 space-y-1">
                        <p>Ordered tests: <span className="font-bold text-slate-700">{order.items.map(i => i.test_name).join(', ')}</span></p>
                        {order.results_summary && (
                          <div className="p-2.5 bg-slate-50 rounded mt-1 border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Results Summary</p>
                            <p className="text-slate-800 mt-0.5 leading-relaxed font-semibold">{order.results_summary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Radiology Investigations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
                <FileText className="h-4.5 w-4.5 text-teal-600 mr-2" /> Radiology & Imaging Reports
              </h3>
              {radiology.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-12 text-center">No imaging reports found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {radiology.map((order) => (
                    <div key={order.id} className="py-3.5 space-y-2">
                      <div className="flex justify-between items-start text-xs font-semibold">
                        <div>
                          <p className="font-bold text-slate-800">{order.test_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{order.created_at}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          order.status === 'completed' || order.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] font-medium text-slate-600 space-y-1">
                        <p>Consulting Doctor: <span className="font-bold text-slate-700">{order.doctor_name}</span></p>
                        {order.results_url && (
                          <a
                            href={`${apiClient.defaults.baseURL}${order.results_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center mt-2 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-[10px] font-black tracking-wide border border-teal-100 uppercase"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Download Scan Report
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVOICES PANEL */}
        {activeTab === 'invoices' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
              <CreditCard className="h-4.5 w-4.5 text-teal-600 mr-2" /> Invoices & Ledger
            </h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-12 text-center">No invoice history found.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs font-semibold">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 font-sans">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-slate-800">{inv.invoice_number}</p>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          inv.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Date: {inv.created_at}</p>
                      <p className="text-slate-500 text-[10px]">
                        Items: {inv.items.map(i => i.description).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Grand Total</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">₹{inv.grand_total.toFixed(2)}</p>
                      </div>
                      {inv.payment_status !== 'paid' && (
                        <button
                          onClick={() => navigate(`/payment/checkout/${inv.id}`)}
                          className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer border-0 transition-all animate-pulse"
                        >
                          Settle Invoice <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK SURVEY PANEL */}
        {activeTab === 'feedback' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center">
              <MessageSquare className="h-4.5 w-4.5 text-teal-600 mr-2" /> Share Your Experience
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Your feedback helps us improve clinical operations and service delivery. Please rate your experience.
            </p>

            {feedbackSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2 text-xs font-bold">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>Thank you! Your feedback has been logged successfully.</span>
              </div>
            )}

            {feedbackError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center space-x-2 text-xs font-bold">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>{feedbackError}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none cursor-pointer border-0 bg-transparent"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Feedback Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="clinical_care">Clinical Care / Doctors</option>
                  <option value="waiting_time">Queue & Waiting Duration</option>
                  <option value="staff_behavior">Staff Behavioral Experience</option>
                  <option value="facility_cleanliness">Facility Cleanliness</option>
                  <option value="billing_pricing">Billing desk / Pricing</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Detailed Remarks</label>
                <textarea
                  required
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share details about your hospital visit, what you liked or how we can improve..."
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full inline-flex justify-center items-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer disabled:opacity-50 border-0 transition-all"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>Submit Feedback Summary</>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default PatientPortal;
