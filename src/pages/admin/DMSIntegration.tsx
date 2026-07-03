import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Alert from '../../components/Alert';
import { 
  Settings, RefreshCw, CheckCircle2, XCircle, Play, 
  HelpCircle, FileText, Loader2, Check, X, ShieldAlert,
  Search, Eye
} from 'lucide-react';

interface IntegrationStats {
  enabled: boolean;
  reachable: boolean;
  last_checked_at: string;
  error?: string;
  data?: any;
}

interface QueueItem {
  id: string;
  tenant_id: string;
  branch_id: string;
  patient_id: string;
  mrn: string;
  dms_document_id: string;
  document_type: string;
  original_filename: string;
  status: string;
  summary_snippet?: string;
  uploaded_by: string;
  uploaded_at: string;
  last_error?: string;
}

export const DMSIntegration: React.FC = () => {
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Backfill inputs
  const [forceBackfill, setForceBackfill] = useState(false);
  const [isTriggeringBackfill, setIsTriggeringBackfill] = useState(false);

  // Review states
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [verificationPatientId, setVerificationPatientId] = useState('');
  const [verificationDocType, setVerificationDocType] = useState('');
  const [verificationSummary, setVerificationSummary] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Preview
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchQueue();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/integrations/dms/status');
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch integration diagnostics status.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await apiClient.get('/api/integrations/dms/queue');
      setQueue(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleBackfill = async () => {
    setIsTriggeringBackfill(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post('/api/integrations/dms/patients/backfill', null, {
        params: { force: forceBackfill }
      });
      setSuccess(res.data.message || 'Background patient backfill task dispatched successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch patient backfill.');
    } finally {
      setIsTriggeringBackfill(false);
    }
  };

  const handleVerify = async (docId: string, patientId: string, originalDocType: string) => {
    setIsSubmittingReview(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        patient_id: patientId || verificationPatientId,
        document_type: verificationDocType || originalDocType || 'Other',
        verified_data: {
          summary: verificationSummary || undefined
        }
      };
      await apiClient.put(`/api/integrations/dms/documents/${docId}/verify`, payload);
      setSuccess(`Document ${docId} verified and linked successfully!`);
      setActiveReviewId(null);
      setVerificationPatientId('');
      setVerificationDocType('');
      setVerificationSummary('');
      await fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to verify document.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting the document.");
      return;
    }
    setIsSubmittingReview(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.put(`/api/integrations/dms/documents/${docId}/reject`, {
        reason: rejectReason
      });
      setSuccess(`Document ${docId} rejected.`);
      setActiveReviewId(null);
      setRejectReason('');
      await fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject document.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReprocess = async (docId: string, mrn: string) => {
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post(`/api/integrations/dms/documents/${docId}/reprocess`, { mrn });
      setSuccess(`Document ${docId} queued for reprocessing.`);
      await fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reprocess document.');
    }
  };

  const handlePreviewDocument = async (docId: string) => {
    setPreviewDocId(docId);
    setPreviewLoading(true);
    try {
      const res = await apiClient.get(`/api/integrations/dms/documents/${docId}/preview-token`);
      const token = res.data.token;
      const previewEndpoint = `${apiClient.defaults.baseURL}/api/integrations/dms/documents/${docId}/preview?token={token}`;
      setPreviewUrl(previewEndpoint.replace('{token}', token));
    } catch (e) {
      console.error("Preview failed:", e);
      alert("Failed to load preview token");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">DMS Document Intelligence Dashboard</h1>
        <p className="text-slate-500 text-sm">Monitor bridge connectivity, backfill patients, and verify AI clinical extraction anomalies.</p>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <Alert type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Connectivity & Controls grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Health status & Refresh */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
              <Settings className="h-5 w-5 text-teal-600 mr-2" /> Connection Diagnostics
            </h3>
            {isLoadingStats ? (
              <div className="flex items-center space-x-2 text-slate-500 text-sm py-4">
                <Loader2 className="animate-spin h-5 w-5 text-teal-600" />
                <span>Checking bridge health...</span>
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Bridge Status:</span>
                  {stats.enabled ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">ACTIVE</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">DISABLED</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">DMS Server Status:</span>
                  {stats.reachable ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> REACHABLE
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" /> UNREACHABLE
                    </span>
                  )}
                </div>
                {stats.error && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium border border-rose-100 max-h-24 overflow-y-auto">
                    <strong>Error: </strong> {stats.error}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 font-medium">
                  Last Checked: {stats.last_checked_at ? new Date(stats.last_checked_at).toLocaleString() : 'Never'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4">Click below to check connectivity state.</div>
            )}
          </div>
          <button
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="mt-6 w-full inline-flex justify-center items-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh Diagnostics
          </button>
        </div>

        {/* Right Card: Batch Patient Backfill */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center">
              <Play className="h-5 w-5 text-teal-600 mr-2" /> Batch Patient Synchronization
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Trigger a non-blocking background migration task to synchronize all existing active patients from HIMS database into DMS reference cache.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceBackfill}
                  onChange={(e) => setForceBackfill(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <div className="ml-3">
                  <span className="text-xs font-bold text-slate-700">Force Synced Re-Upsert</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    If checked, the migration task will re-sync and overwrite patients who are already successfully recorded as synced.
                  </p>
                </div>
              </label>
            </div>
          </div>
          <button
            onClick={handleBackfill}
            disabled={isTriggeringBackfill || !stats?.reachable}
            className="mt-6 inline-flex justify-center items-center py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            {isTriggeringBackfill ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Execute Demographics Backfill Sync
          </button>
        </div>
      </div>

      {/* Manual Verification Queue */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
            <ShieldAlert className="h-5 w-5 text-teal-600 mr-2" /> Manual Verification Review Queue
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
            {queue.length} Flagged / Failed
          </span>
        </div>

        {isLoadingQueue ? (
          <div className="p-8 text-center text-slate-500 font-bold flex items-center justify-center space-x-2">
            <Loader2 className="animate-spin h-5 w-5 text-teal-600" />
            <span>Loading review queue...</span>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Review queue is clear! All documents matching patient IDs are verified and synced.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Linked Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Extraction Error</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-xs">
                {queue.map((item) => (
                  <React.Fragment key={item.dms_document_id}>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-teal-600" /> {item.original_filename}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 ml-6">{item.dms_document_id}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 ml-6">Uploaded: {new Date(item.uploaded_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">MRN: {item.mrn}</span>
                          <span className="text-[10px] text-slate-500">HIMS ID: {item.patient_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">
                        {item.last_error || 'Identity ambiguity detected'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          item.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {item.status === 'failed' ? 'Failed' : 'Needs Review'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handlePreviewDocument(item.dms_document_id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[10px] inline-flex items-center cursor-pointer"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </button>
                        <button
                          onClick={() => {
                            if (activeReviewId === item.dms_document_id) {
                              setActiveReviewId(null);
                            } else {
                              setActiveReviewId(item.dms_document_id);
                              setVerificationPatientId(item.patient_id);
                              setVerificationDocType(item.document_type);
                              setVerificationSummary(item.summary_snippet || '');
                            }
                          }}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md font-bold text-[10px] inline-flex items-center cursor-pointer"
                        >
                          Resolve Action
                        </button>
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleReprocess(item.dms_document_id, item.mrn)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold text-[10px] inline-flex items-center cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Inline Resolve review drawer */}
                    {activeReviewId === item.dms_document_id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-slate-50">
                          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-4 max-w-2xl">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Resolve Document Extraction Conflict</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Patient HIMS ID</label>
                                <input
                                  type="text"
                                  value={verificationPatientId}
                                  onChange={(e) => setVerificationPatientId(e.target.value)}
                                  className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Document Type</label>
                                <select
                                  value={verificationDocType}
                                  onChange={(e) => setVerificationDocType(e.target.value)}
                                  className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-teal-500"
                                >
                                  <option value="Prescription">Prescription</option>
                                  <option value="Lab Report">Lab Report</option>
                                  <option value="Discharge Summary">Discharge Summary</option>
                                  <option value="Referral Letter">Referral Letter</option>
                                  <option value="Radiology Report">Radiology Report</option>
                                  <option value="Other">Other Clinical Note</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">AI Clinical Summary Verification</label>
                                <textarea
                                  value={verificationSummary}
                                  onChange={(e) => setVerificationSummary(e.target.value)}
                                  rows={3}
                                  className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                  placeholder="Provide clinical summary of the document contents if required"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4">
                              {/* Rejection input */}
                              <div className="flex items-center space-x-2 flex-1 mr-4">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Provide rejection reason..."
                                  className="block w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                                />
                                <button
                                  onClick={() => handleReject(item.dms_document_id)}
                                  disabled={isSubmittingReview}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs inline-flex items-center cursor-pointer transition-all"
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject File
                                </button>
                              </div>
                              
                              <div className="space-x-2 flex items-center">
                                <button
                                  onClick={() => setActiveReviewId(null)}
                                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleVerify(item.dms_document_id, item.patient_id, item.document_type)}
                                  disabled={isSubmittingReview}
                                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs inline-flex items-center cursor-pointer transition-all"
                                >
                                  {isSubmittingReview ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                                  Approve & Link Document
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secure Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold tracking-wide uppercase">Secure DMS Document Viewer</h3>
                <p className="text-[10px] text-slate-300 font-mono mt-0.5">Document ID: {previewDocId}</p>
              </div>
              <button
                onClick={() => { setPreviewUrl(null); setPreviewDocId(null); }}
                className="text-white hover:text-rose-400 font-extrabold cursor-pointer border-0 bg-transparent text-lg"
              >
                &times; Close Viewer
              </button>
            </div>
            <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 relative">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center text-slate-500 font-bold">
                  <Loader2 className="animate-spin h-8 w-8 text-teal-600 mb-2" />
                  Acquiring Secure Preview Token...
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-lg border border-slate-300 shadow-inner"
                  title="Secure DMS Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
