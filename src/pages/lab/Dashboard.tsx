import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { SkeletonTable } from '../../components/Skeleton';
import { 
  FlaskConical, Search, CheckCircle, Clock, Play, FileText, 
  Download, Loader2, AlertCircle, RefreshCw, Eye 
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
  status: 'ordered' | 'sample_collected' | 'result_entered' | 'verified';
  doctor_name: string;
  patient_name: string;
  created_at: string;
}

interface LabResultEntry {
  test_id: string;
  test_name: string;
  result_value: string;
  normal_range: string;
  unit: string;
  abnormal_flag: boolean;
}

interface LabResult {
  id: string;
  lab_order_id: string;
  results: LabResultEntry[];
  pdf_url?: string;
}

export const LabDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ordered' | 'sample_collected' | 'result_entered' | 'verified'>('ordered');
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Result Viewer Modal
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [selectedResults, setSelectedResults] = useState<LabResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/labs/orders', {
        params: { status: activeTab }
      });
      setOrders(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve laboratory orders checklist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    setError(null);
    try {
      await apiClient.put(`/api/labs/orders/${orderId}/status`, null, {
        params: { status: newStatus }
      });
      // Refresh checklist
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update order status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewResults = async (order: LabOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const res = await apiClient.get(`/api/labs/orders/${order.id}/results`);
      setSelectedResults(res.data);
    } catch (err) {
      console.error(err);
      setSelectedResults(null);
    } finally {
      setIsModalLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ['Order Date', 'Patient Name', 'Requested Tests', 'Ordering Doctor', 'Status'];
    const rows = filteredOrders.map(o => [
      new Date(o.created_at).toLocaleString(),
      o.patient_name,
      o.items.map(i => i.test_name).join('; '),
      o.doctor_name,
      o.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lab_orders_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(o => 
    o.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.items.some(i => i.test_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <FlaskConical className="h-6 w-6 text-teal-600 mr-2" /> Lab Orders Worklist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage patient samples, document analytical values, and verify scan results.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Refresh Worklist
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Tab bar + Search Bar layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status Tab buttons */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ordered')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'ordered' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Pending Samples
          </button>
          <button
            onClick={() => setActiveTab('sample_collected')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'sample_collected' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Under Test
          </button>
          <button
            onClick={() => setActiveTab('result_entered')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'result_entered' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Completed & Drafts
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'verified' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Verified Reports
          </button>
        </div>

        {/* High-density Search field */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, doctor, or test..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* Orders Table checklist */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} columns={7} />
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">
            No lab orders found matching the criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-medium text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Order Date</th>
                <th className="px-6 py-3.5">Patient Details</th>
                <th className="px-6 py-3.5">Requested Tests</th>
                <th className="px-6 py-3.5">Ordering Doctor</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}<br/>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/reception/patients/${order.patient_id}`} className="font-bold text-teal-600 hover:text-teal-850 hover:underline">
                      {order.patient_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {order.items.map(i => (
                        <span key={i.test_id} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {i.test_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{order.doctor_name}</td>
                  <td className="px-6 py-4 text-right">
                    {/* Action buttons matching status tab */}
                    {activeTab === 'ordered' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'sample_collected')}
                        disabled={actionLoading === order.id}
                        className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 mr-1" />
                        )}
                        Collect Sample
                      </button>
                    )}

                    {activeTab === 'sample_collected' && (
                      <button
                        onClick={() => navigate(`/lab/results/enter/${order.id}`)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Enter Results
                      </button>
                    )}

                    {activeTab === 'result_entered' && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewResults(order)}
                          className="inline-flex items-center px-2 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(order.id, 'verified')}
                          disabled={actionLoading === order.id}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          Verify & Publish
                        </button>
                      </div>
                    )}

                    {activeTab === 'verified' && (
                      <button
                        onClick={() => handleViewResults(order)}
                        className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" /> View Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lab Results Quick Viewer Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Diagnostic Values: {selectedOrder.patient_name}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  Reference Order: #{selectedOrder.id.substring(18)}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedResults(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {isModalLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin h-7 w-7 text-teal-600" />
                </div>
              ) : selectedResults ? (
                <div className="space-y-6 text-xs">
                  {/* Results Grid Table */}
                  {selectedResults.results && selectedResults.results.length > 0 ? (
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                          <th className="py-2">Test Component</th>
                          <th className="py-2">Recorded Value</th>
                          <th className="py-2">Normal Threshold</th>
                          <th className="py-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedResults.results.map(res => (
                          <tr key={res.test_id} className="border-b border-slate-100">
                            <td className="py-2.5 font-bold text-slate-700">{res.test_name}</td>
                            <td className={`py-2.5 font-mono font-bold ${
                              res.abnormal_flag 
                                ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-150' 
                                : 'text-slate-800'
                            }`}>
                              {res.result_value} {res.abnormal_flag && '(ABNORMAL)'}
                            </td>
                            <td className="py-2.5 text-slate-500 font-mono font-semibold">{res.normal_range}</td>
                            <td className="py-2.5 text-slate-500 font-semibold">{res.unit || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-6 text-slate-400 font-semibold italic">
                      No numerical metrics documented for this lab order.
                    </div>
                  )}

                  {/* Attachment PDF file link */}
                  {selectedResults.pdf_url && (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-500" />
                        <span className="font-bold text-slate-700">Lab Diagnostic Scan Report (PDF)</span>
                      </div>
                      <a
                        href={`${apiClient.defaults.baseURL || ''}${selectedResults.pdf_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow-sm text-[10px] cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Open Scan Report
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-semibold italic">
                  Results have not been recorded or submitted for this order.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedResults(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default LabDashboard;
