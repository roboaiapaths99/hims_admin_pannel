import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Loader2, Save, ArrowLeft, Upload, CheckCircle2, AlertCircle, FileText, Trash2 
} from 'lucide-react';

interface RadiologyOrder {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_mrn?: string;
  modality: string;
  test_name: string;
  status: string;
}

export const EnterResults: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<RadiologyOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [imageLinks, setImageLinks] = useState<string[]>([]);

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/radiology/orders');
      const found = res.data.find((o: RadiologyOrder) => o.id === orderId);
      if (found) {
        setOrder(found);
      } else {
        setError('Radiology order record not found in active registries.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve order metadata.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Call the existing backend storage uploader route
      const res = await apiClient.post('/api/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // The upload endpoint returns the file url in res.data.file_url or res.data.url
      const url = res.data.file_url || res.data.url;
      if (url) {
        setImageLinks(prev => [...prev, url]);
        setSelectedFile(null);
      } else {
        setError('Uploader returned unexpected response structure.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload attachment file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findings || !impression) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        findings,
        impression,
        image_links: imageLinks
      };
      await apiClient.post(`/api/radiology/orders/${orderId}/results`, payload);
      navigate('/radiology/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit diagnostics report.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-md mx-auto mt-12 font-sans">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold text-red-850">Diagnostic Order Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={() => navigate('/radiology/dashboard')}
          className="inline-flex items-center text-xs font-bold text-teal-600 hover:text-teal-850"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Worklist
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/radiology/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Worklist
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Findings Recorder</span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Patient details & attachments */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Order Specifications</span>
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-teal-400 font-mono uppercase block">Patient Name</span>
                  <h4 className="font-bold text-sm mt-1">{order.patient_name}</h4>
                  <p className="font-mono text-slate-400 text-[10px] mt-0.5">MRN: {order.patient_mrn}</p>
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[9px] font-bold text-teal-400 font-mono uppercase block">Test Modality</span>
                  <h4 className="font-bold mt-1">{order.test_name}</h4>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-teal-550/20 text-teal-300 border border-teal-500/20 mt-1">
                    {order.modality}
                  </span>
                </div>
              </div>
            </div>

            {/* Scan Image Upload Panel */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Attachment Uploader</span>
              <form onSubmit={handleFileUpload} className="space-y-3">
                <input
                  type="file"
                  id="scan-image"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="scan-image"
                  className="flex items-center justify-center border border-dashed border-slate-300 hover:bg-slate-50 rounded-lg py-3 px-4 cursor-pointer text-xs font-bold text-slate-600"
                >
                  <Upload className="h-4.5 w-4.5 mr-2 text-slate-400" />
                  {selectedFile ? selectedFile.name.slice(0, 15) + '...' : 'Choose Scan File'}
                </label>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> : null}
                  Upload scan image
                </button>
              </form>

              {/* Uploaded Scan Links List */}
              {imageLinks.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scan Files ({imageLinks.length})</span>
                  <div className="space-y-2">
                    {imageLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold">
                        <span className="truncate max-w-[150px] text-slate-600 font-mono">Scan #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <FileText className="h-4.5 w-4.5 text-teal-600 mr-2" /> Write Diagnostic Report
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Clinical Findings</label>
                  <textarea
                    rows={8}
                    required
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full border border-slate-350 rounded-lg p-3 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                    placeholder="Enter detailed clinical findings from the scan..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnostic Impression</label>
                  <textarea
                    rows={3}
                    required
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    className="w-full border border-slate-350 rounded-lg p-3 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed font-bold"
                    placeholder="Summarize the core diagnostic impression/conclusions..."
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSaving || !findings || !impression}
                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save & Submit Diagnostic Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EnterResults;
