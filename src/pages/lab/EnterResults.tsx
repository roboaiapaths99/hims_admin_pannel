import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, FlaskConical, FileText, Upload, Save, 
  Loader2, AlertCircle, CheckCircle, Info 
} from 'lucide-react';

interface LabOrderItem {
  test_id: string;
  test_name: string;
  test_code: string;
  price: number;
}

interface LabOrder {
  id: string;
  patient_id: string;
  visit_id: string;
  items: LabOrderItem[];
  status: string;
  doctor_name: string;
  patient_name: string;
}

interface LabTestMaster {
  id: string;
  test_name: string;
  test_code: string;
  price: number;
  normal_range: string;
  unit: string;
}

export const EnterResults: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [masterTests, setMasterTests] = useState<Record<string, LabTestMaster>>({});
  
  // Results form state
  const [resultsMap, setResultsMap] = useState<Record<string, string>>({});
  const [reportFile, setReportFile] = useState<File | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndConfig();
    }
  }, [orderId]);

  const fetchOrderAndConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch order details
      const orderRes = await apiClient.get(`/api/labs/orders/${orderId}`);
      setOrder(orderRes.data);

      // 2. Fetch master test details for normal range mapping
      const masterRes = await apiClient.get('/api/config/lab-tests');
      const masterMap: Record<string, LabTestMaster> = {};
      masterRes.data.forEach((t: LabTestMaster) => {
        masterMap[t.test_code] = t;
      });
      setMasterTests(masterMap);

      // Initialize result fields mapping
      const initialMap: Record<string, string> = {};
      orderRes.data.items.forEach((item: LabOrderItem) => {
        initialMap[item.test_id] = '';
      });
      
      // Attempt to prefill if results already entered
      try {
        const resultsRes = await apiClient.get(`/api/labs/orders/${orderId}/results`);
        resultsRes.data.results.forEach((r: any) => {
          initialMap[r.test_id] = r.result_value;
        });
      } catch (err) {
        // No results entered yet, keep them blank
      }
      
      setResultsMap(initialMap);

    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve order or master lab configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (testId: string, val: string) => {
    setResultsMap(prev => ({ ...prev, [testId]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF documents are allowed as reports.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File exceeds maximum size boundary of 15MB.');
        return;
      }
      setReportFile(file);
      setError(null);
    }
  };

  const handleSaveAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !orderId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Build results array
      const resultsPayload = Object.keys(resultsMap).map(testId => {
        const orderItem = order.items.find(i => i.test_id === testId);
        const config = masterTests[testId];
        return {
          test_id: testId,
          test_name: orderItem?.test_name || testId,
          result_value: resultsMap[testId],
          normal_range: config?.normal_range || '',
          unit: config?.unit || '',
          abnormal_flag: false // Backend automatically calculates this
        };
      });

      // Validation check
      if (resultsPayload.some(r => !r.result_value.trim())) {
        throw new Error('Please enter result values for all requested tests.');
      }

      // 2. Upload PDF Report first if selected
      let uploadedPdfUrl: string | undefined = undefined;
      if (reportFile) {
        const formData = new FormData();
        formData.append('file', reportFile);
        const uploadRes = await apiClient.post(`/api/labs/orders/${orderId}/upload-report`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedPdfUrl = uploadRes.data.pdf_url;
      }

      // 3. Submit result values
      await apiClient.post(`/api/labs/orders/${orderId}/results`, {
        results: resultsPayload,
        pdf_url: uploadedPdfUrl
      });

      setSuccess('Diagnostic values saved and order updated successfully.');
      setTimeout(() => {
        navigate('/lab/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || err.response?.data?.detail || 'Failed to submit lab results.');
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

  if (!order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto mt-12 text-xs">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">Lab Order Profile Not Found</h2>
        <button
          onClick={() => navigate('/lab/dashboard')}
          className="inline-flex items-center text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/lab/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Lab Worklist
        </button>
        <span className="text-xs font-bold text-slate-400 font-mono">Order Reference: #{order.id.substring(18)}</span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-teal-700">
          <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Main form grid splits demographics and results builder */}
      <form onSubmit={handleSaveAndSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Demographics Profile */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">Patient Directory File</span>
              <h2 className="text-md font-bold truncate mt-1">{order.patient_name}</h2>
              <div className="flex justify-between text-[11px] text-slate-300 mt-2 font-mono">
                <span>Ref: {order.doctor_name}</span>
                <span>Status: {order.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-xs text-blue-800 space-y-2">
            <h4 className="font-bold flex items-center">
              <Info className="h-4 w-4 mr-1.5 text-blue-600 flex-shrink-0" /> Ranges Guide
            </h4>
            <p className="leading-relaxed">
              Ensure numerical readings correspond exactly with the components. Ranges and units are auto-mapped from the master catalogs.
            </p>
          </div>
        </div>

        {/* Right Side: Analytical Values Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center border-b border-slate-100 pb-3">
              <FlaskConical className="h-4.5 w-4.5 text-teal-600 mr-2" /> Record Component metrics
            </h3>

            {/* Input grid for each ordered test */}
            <div className="space-y-4">
              {order.items.map(item => {
                const config = masterTests[item.test_id];
                return (
                  <div key={item.test_id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{item.test_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 uppercase tracking-wide block">{item.test_code}</span>
                    </div>
                    
                    <div className="relative mt-1 md:mt-0">
                      <input
                        type="text"
                        placeholder="Enter value..."
                        required
                        value={resultsMap[item.test_id] || ''}
                        onChange={(e) => handleValueChange(item.test_id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                      <span className="block font-mono">Normal: {config?.normal_range || 'N/A'}</span>
                      <span className="block">Unit: {config?.unit || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* File upload PDF box */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Attach Diagnostic Scan File (PDF Format Only)
              </label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-6 transition-all text-center relative bg-slate-50">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                
                {reportFile ? (
                  <div className="mt-2 text-xs text-teal-700 font-bold flex items-center justify-center">
                    <FileText className="h-4.5 w-4.5 mr-1 text-red-500" />
                    Selected: {reportFile.name} ({(reportFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Drag and drop or click here to upload the clinical PDF report.
                  </p>
                )}
              </div>
            </div>

            {/* Submit button bar */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save and Publish results
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
};
export default EnterResults;
