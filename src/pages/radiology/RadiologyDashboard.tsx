import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Loader2, Search, RefreshCw, CheckCircle2, FlaskConical, Play, FileText, AlertCircle, Eye, 
  Activity, Sliders, PlayCircle, PauseCircle, ZoomIn, Move, RotateCcw
} from 'lucide-react';

interface RadiologyOrder {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_mrn?: string;
  visit_id?: string;
  modality: string;
  test_name: string;
  status: 'ordered' | 'performed' | 'reported';
  created_at: string;
}

interface RadiologyResult {
  id: string;
  findings: string;
  impression: string;
  image_links: string[];
  reported_by_name?: string;
  created_at: string;
}

export const RadiologyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'ordered' | 'performed' | 'reported'>('ordered');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');

  // View Report Modal
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [viewingResult, setViewingResult] = useState<RadiologyResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  // DICOM Viewer Modal states
  const [showDicomModal, setShowDicomModal] = useState(false);
  const [dicomSlice, setDicomSlice] = useState(12);
  const [dicomZoom, setDicomZoom] = useState(1);
  const [dicomPanX, setDicomPanX] = useState(0);
  const [dicomPanY, setDicomPanY] = useState(0);
  const [dicomBrightness, setDicomBrightness] = useState(100);
  const [dicomContrast, setDicomContrast] = useState(100);
  const [isLooping, setIsLooping] = useState(false);
  const [measurementMode, setMeasurementMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [measureLine, setMeasureLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/radiology/orders');
      setOrders(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch radiology orders worklist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformOrder = async (orderId: string) => {
    setError(null);
    try {
      await apiClient.post(`/api/radiology/orders/${orderId}/perform`);
      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, status: 'performed' } : o)
      );
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update order status to performed.');
    }
  };

  const handleViewReport = async (order: RadiologyOrder) => {
    setSelectedOrder(order);
    setIsLoadingResult(true);
    setViewingResult(null);
    try {
      const res = await apiClient.get(`/api/radiology/orders/${order.id}/results`);
      setViewingResult(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to retrieve report findings.');
    } finally {
      setIsLoadingResult(false);
    }
  };

  // DICOM play loop animation
  useEffect(() => {
    let interval: any;
    if (isLooping) {
      interval = setInterval(() => {
        setDicomSlice(prev => (prev >= 24 ? 1 : prev + 1));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isLooping]);

  // DICOM canvas rendering
  const drawDicomSlice = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark clinical viewer background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply zoom & pan translation
    ctx.translate(canvas.width / 2 + dicomPanX, canvas.height / 2 + dicomPanY);
    ctx.scale(dicomZoom, dicomZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply brightness & contrast CSS filter simulation
    ctx.filter = `brightness(${dicomBrightness}%) contrast(${dicomContrast}%)`;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Body contour (cross section ellipse)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 140, 100, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Rib cage bones dots
    ctx.fillStyle = '#e2e8f0';
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.3) {
      const rx = cx + 130 * Math.cos(angle);
      const ry = cy + 90 * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Spine vertebra
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.rect(cx - 15, cy + 70, 30, 20);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText("SPINE", cx - 13, cy + 82);

    // Lung cavity lobes (diameter changes with slice value)
    const lungFactor = Math.sin((dicomSlice / 24) * Math.PI);
    const lungW = 40 + lungFactor * 15;
    const lungH = 60 + lungFactor * 15;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    // Left lung lobe
    ctx.beginPath();
    ctx.ellipse(cx - 50, cy - 10, lungW, lungH, 0.05, 0, 2 * Math.PI);
    ctx.stroke();
    // Right lung lobe
    ctx.beginPath();
    ctx.ellipse(cx + 50, cy - 10, lungW, lungH, -0.05, 0, 2 * Math.PI);
    ctx.stroke();

    // Heart cavity
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 15, 22, 0, 2 * Math.PI);
    ctx.stroke();

    // Crosshair target grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    ctx.restore();

    // Draw neon green distance ruler line
    if (measureLine) {
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(measureLine.x1, measureLine.y1);
      ctx.lineTo(measureLine.x2, measureLine.y2);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(measureLine.x1, measureLine.y1, 4.5, 0, 2 * Math.PI);
      ctx.arc(measureLine.x2, measureLine.y2, 4.5, 0, 2 * Math.PI);
      ctx.fill();

      // mm calibration
      const dx = measureLine.x2 - measureLine.x1;
      const dy = measureLine.y2 - measureLine.y1;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const distMm = (distPx * 0.17).toFixed(1);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#22c55e';
      ctx.fillText(`${distMm} mm`, (measureLine.x1 + measureLine.x2) / 2 + 8, (measureLine.y1 + measureLine.y2) / 2 - 8);
      ctx.restore();
    }
  };

  useEffect(() => {
    if (showDicomModal && canvasRef.current) {
      drawDicomSlice();
    }
  }, [
    showDicomModal, dicomSlice, dicomZoom, dicomPanX, dicomPanY, 
    dicomBrightness, dicomContrast, measureLine
  ]);

  // Canvas Mouse events for measurements
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measurementMode) return;
    const pos = getCanvasMousePos(e);
    setMeasureLine({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !measureLine) return;
    const pos = getCanvasMousePos(e);
    setMeasureLine(prev => prev ? { ...prev, x2: pos.x, y2: pos.y } : null);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const resetDicomControls = () => {
    setDicomZoom(1);
    setDicomPanX(0);
    setDicomPanY(0);
    setDicomBrightness(100);
    setDicomContrast(100);
    setMeasureLine(null);
    setMeasurementMode(false);
  };

  // Filter & Search logic
  const filteredOrders = orders.filter(o => {
    const matchesStatus = o.status === activeTab;
    const matchesModality = modalityFilter === '' || o.modality === modalityFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (o.patient_name?.toLowerCase().includes(searchLower)) ||
      (o.patient_mrn?.toLowerCase().includes(searchLower)) ||
      (o.test_name.toLowerCase().includes(searchLower));
    
    return matchesStatus && matchesModality && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <FlaskConical className="h-6 w-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Radiology & Diagnostic Imaging</h2>
            <p className="text-xs text-slate-500 font-semibold">Manage modality imaging schedules, capture clinical findings, and attach patient scan files.</p>
          </div>
        </div>
        <div>
          <button
            onClick={fetchOrders}
            className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all inline-flex items-center cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh worklist
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-1.5 text-xs font-bold">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('ordered')}
            className={`pb-2.5 transition-all border-b-2 cursor-pointer ${activeTab === 'ordered' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Pending Modality Scans
          </button>
          <button
            onClick={() => setActiveTab('performed')}
            className={`pb-2.5 transition-all border-b-2 cursor-pointer ${activeTab === 'performed' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Performed (Pending Report)
          </button>
          <button
            onClick={() => setActiveTab('reported')}
            className={`pb-2.5 transition-all border-b-2 cursor-pointer ${activeTab === 'reported' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            Completed & Reported
          </button>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="">All Modalities</option>
            <option value="CT">CT Scan</option>
            <option value="MRI">MRI</option>
            <option value="X-RAY">X-Ray</option>
            <option value="US">Ultrasound</option>
          </select>
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Orders worklist */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic font-semibold">
            No worklist items matched the selected filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-medium text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <th className="px-6 py-3.5">Patient Details</th>
                <th className="px-6 py-3.5">Modality</th>
                <th className="px-6 py-3.5">Test Name</th>
                <th className="px-6 py-3.5">Date Ordered</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 block">{order.patient_name || 'Unknown'}</span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">MRN: {order.patient_mrn}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                      {order.modality}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-750">
                    {order.test_name}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {order.status === 'ordered' && (
                        <button
                          onClick={() => handlePerformOrder(order.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold cursor-pointer transition-all shadow-sm"
                        >
                          <Play className="h-3 w-3 mr-1.5" /> Perform Scan
                        </button>
                      )}
                      {order.status === 'performed' && (
                        <>
                          <button
                            onClick={() => navigate(`/radiology/results/enter/${order.id}`)}
                            className="inline-flex items-center px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            <FileText className="h-3 w-3 mr-1.5" /> Write Report
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); setShowDicomModal(true); }}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded text-xs font-bold cursor-pointer transition-all"
                          >
                            <Activity className="h-3 w-3 mr-1.5 text-teal-600 animate-pulse" /> DICOM Viewer
                          </button>
                        </>
                      )}
                      {order.status === 'reported' && (
                        <>
                          <button
                            onClick={() => handleViewReport(order)}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-350 hover:bg-slate-50 text-slate-700 rounded text-xs font-bold cursor-pointer transition-all"
                          >
                            <Eye className="h-3 w-3 mr-1.5" /> View Report
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); setShowDicomModal(true); }}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-bold cursor-pointer transition-all"
                          >
                            <Activity className="h-3 w-3 mr-1.5" /> DICOM Viewer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Report Modal */}
      {selectedOrder && !showDicomModal && (viewingResult || isLoadingResult) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Diagnostic Radiology Report</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Order ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => { setSelectedOrder(null); setViewingResult(null); }} 
                className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>
            
            {isLoadingResult ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
              </div>
            ) : viewingResult ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs">
                  <div>
                    <span className="font-semibold text-slate-450 uppercase block text-[9px]">Patient Name</span>
                    <span className="font-bold text-slate-800">{selectedOrder.patient_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-455 uppercase block text-[9px]">Test Modality</span>
                    <span className="font-bold text-slate-800">{selectedOrder.test_name} ({selectedOrder.modality})</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Clinical Findings</h4>
                    <p className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                      {viewingResult.findings}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnostic Impression</h4>
                    <p className="text-xs font-bold text-slate-900 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                      {viewingResult.impression}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                  <span>Reported By: {viewingResult.reported_by_name || 'Staff Radiologist'}</span>
                  <span>Date: {new Date(viewingResult.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* DICOM Viewer Simulation Modal */}
      {showDicomModal && selectedOrder && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans no-print">
          <div className="bg-[#0b0f19] border border-slate-850 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            
            {/* DICOM Header Banner */}
            <div className="bg-[#111827] border-b border-slate-800 px-6 py-3 flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-teal-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100 tracking-wide uppercase">Cornerstone DICOM Simulator</h3>
                  <p className="text-[9px] text-slate-500 font-mono">Study Instance UID: 1.2.840.113619.2.{selectedOrder.id}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowDicomModal(false); resetDicomControls(); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2 py-1 rounded text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {/* Main Viewer splits workspace and controls */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
              
              {/* Left Sidebar: Slice Navigator */}
              <div className="bg-[#0f172a] border-r border-slate-850 p-4 space-y-4 text-xs font-semibold text-slate-400">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Series Stack</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span>Modality:</span>
                      <span className="font-bold text-slate-200">{selectedOrder.modality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target:</span>
                      <span className="font-bold text-slate-200">{selectedOrder.test_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frame count:</span>
                      <span className="font-bold text-slate-200">24 Slices</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Slice Select ({dicomSlice}/24)</label>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={dicomSlice}
                    onChange={(e) => setDicomSlice(parseInt(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 border font-bold cursor-pointer text-xs ${
                        isLooping 
                          ? 'bg-rose-950 text-rose-450 border-rose-900 hover:bg-rose-900' 
                          : 'bg-teal-950 text-teal-400 border-teal-900 hover:bg-teal-900'
                      }`}
                    >
                      {isLooping ? (
                        <>
                          <PauseCircle className="h-4 w-4" /> Stop Cine Loop
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4" /> Cine Play Loop
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Quick Annotations</h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium">
                    Enable the **Draw Distance** tool and drag across the diagnostic canvas to measure critical structures or lesions in millimeters.
                  </p>
                </div>
              </div>

              {/* Center Screen: Canvas Drawing Area */}
              <div className="lg:col-span-2 bg-[#020617] flex items-center justify-center relative select-none">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={320}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className={`border border-slate-900 rounded-lg shadow-inner max-w-full ${
                    measurementMode ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                />
                
                {/* Calibration labels inside canvas */}
                <div className="absolute top-4 left-4 text-[10px] text-teal-500 font-bold font-mono space-y-0.5">
                  <p>TE: 85 ms</p>
                  <p>TR: 2200 ms</p>
                  <p>FOV: 240 mm</p>
                </div>
                <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 font-bold font-mono">
                  <p>Zoom: {Math.round(dicomZoom * 100)}%</p>
                  <p>S: {dicomSlice}</p>
                </div>
              </div>

              {/* Right Sidebar: Dynamic Filters Controls */}
              <div className="bg-[#0f172a] border-l border-slate-850 p-4 space-y-5 text-xs font-semibold text-slate-400">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cornerstone controls</h4>

                {/* Interaction Modes */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Interaction mode</span>
                  <button
                    onClick={() => setMeasurementMode(!measurementMode)}
                    className={`w-full py-1.5 border rounded cursor-pointer font-bold transition-all text-xs ${
                      measurementMode 
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900' 
                        : 'bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {measurementMode ? '✓ Ruler Tool Active' : 'Enable Ruler Measurement'}
                  </button>
                </div>

                {/* Translation Pan/Zoom */}
                <div className="space-y-3.5 pt-2 border-t border-slate-800">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Imaging filters</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Brightness</span>
                      <span className="font-mono text-slate-350">{dicomBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={dicomBrightness}
                      onChange={(e) => setDicomBrightness(parseInt(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Contrast</span>
                      <span className="font-mono text-slate-350">{dicomContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={dicomContrast}
                      onChange={(e) => setDicomContrast(parseInt(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Scale / Zoom</span>
                      <span className="font-mono text-slate-350">{Math.round(dicomZoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.1}
                      value={dicomZoom}
                      onChange={(e) => setDicomZoom(parseFloat(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Pan Adjustments */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Interactive Pan</span>
                  <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto text-center font-mono">
                    <div/>
                    <button onClick={() => setDicomPanY(p => p - 10)} className="bg-slate-900 border border-slate-800 rounded p-1 hover:bg-slate-800 text-slate-200 cursor-pointer">▲</button>
                    <div/>
                    <button onClick={() => setDicomPanX(p => p - 10)} className="bg-slate-900 border border-slate-800 rounded p-1 hover:bg-slate-800 text-slate-200 cursor-pointer">◀</button>
                    <button onClick={resetDicomControls} className="bg-slate-950 border border-slate-800 rounded p-1 hover:bg-slate-800 text-rose-500 cursor-pointer"><RotateCcw className="h-3 w-3 mx-auto"/></button>
                    <button onClick={() => setDicomPanX(p => p + 10)} className="bg-slate-900 border border-slate-800 rounded p-1 hover:bg-slate-800 text-slate-200 cursor-pointer">▶</button>
                    <div/>
                    <button onClick={() => setDicomPanY(p => p + 10)} className="bg-slate-900 border border-slate-800 rounded p-1 hover:bg-slate-800 text-slate-200 cursor-pointer">▼</button>
                    <div/>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Patient banner */}
            <div className="bg-[#111827] border-t border-slate-800 px-6 py-4 flex justify-between items-center text-xs font-semibold text-slate-400">
              <div className="flex gap-6">
                <div>
                  <span className="text-[9px] text-slate-650 block uppercase">Demographics</span>
                  <span className="font-bold text-slate-200">{selectedOrder.patient_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-650 block uppercase">MRN</span>
                  <span className="font-mono text-slate-200">{selectedOrder.patient_mrn}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-650 block uppercase">Study ID</span>
                  <span className="font-bold text-teal-400">{selectedOrder.test_name}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default RadiologyDashboard;
