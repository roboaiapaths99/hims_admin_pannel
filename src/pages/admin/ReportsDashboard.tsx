import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  TrendingUp, Activity, Clock, Users, Calendar, 
  Download, Filter, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';

interface RevenueBranch {
  branch_id: string;
  branch_name: string;
  amount: number;
}

interface RevenueDoctor {
  doctor_name: string;
  amount: number;
}

interface RevenueCategory {
  category: string;
  amount: number;
}

interface DailyRevenue {
  date: string;
  amount: number;
}

interface RevenueReport {
  revenue_by_branch: RevenueBranch[];
  revenue_by_doctor: RevenueDoctor[];
  revenue_by_category: RevenueCategory[];
  daily_revenue: DailyRevenue[];
  total_revenue: number;
}

interface DailyVisit {
  date: string;
  count: number;
}

interface OperationalReport {
  total_visits_count: number;
  unique_patients_count: number;
  average_visits_per_patient: number;
  daily_visits: DailyVisit[];
  average_consultation_time_mins: number;
  average_lab_turnaround_time_mins: number;
}

export const ReportsDashboard: React.FC = () => {
  // Preset dates: default to last 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);
  const [operationalData, setOperationalData] = useState<OperationalReport | null>(null);
  const [activeTab, setActiveTab] = useState<'finance' | 'ops'>('finance');

  // Chart tooltip state
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate
      };
      
      const [revRes, opsRes] = await Promise.all([
        apiClient.get('/api/reports/revenue', { params }),
        apiClient.get('/api/reports/operational', { params })
      ]);

      setRevenueData(revRes.data);
      setOperationalData(opsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch reports. Please verify backend service connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportData();
  };

  // Set date ranges via quick filters
  const applyPreset = (days: number) => {
    const end = today;
    let start = '';
    if (days === 0) {
      // This Month (start of current month)
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else {
      start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    setStartDate(start);
    setEndDate(end);
    // Directly fetch using new dates
    setIsLoading(true);
    const params = { start_date: start, end_date: end };
    Promise.all([
      apiClient.get('/api/reports/revenue', { params }),
      apiClient.get('/api/reports/operational', { params })
    ]).then(([revRes, opsRes]) => {
      setRevenueData(revRes.data);
      setOperationalData(opsRes.data);
    }).catch(err => {
      console.error(err);
      setError('Failed to apply filter preset.');
    }).finally(() => setIsLoading(false));
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (activeTab === 'finance') {
      if (!revenueData || revenueData.daily_revenue.length === 0) return;
      let csvContent = 'data:text/csv;charset=utf-8,Date,Revenue Amount\n';
      revenueData.daily_revenue.forEach(row => {
        csvContent += `${row.date},${row.amount}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `financial_revenue_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (!operationalData || operationalData.daily_visits.length === 0) return;
      let csvContent = 'data:text/csv;charset=utf-8,Date,Visits Count\n';
      operationalData.daily_visits.forEach(row => {
        csvContent += `${row.date},${row.count}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `operational_visits_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper: Format Category Labels nicely
  const formatCategory = (cat: string) => {
    switch(cat) {
      case 'consultation': return 'OPD Consultation Fees';
      case 'lab': return 'Diagnostics & Lab Tests';
      case 'pharmacy': return 'Pharmacy / Medicines';
      case 'ot': return 'OT / Surgery Charges';
      default: return 'Other General charges';
    }
  };

  // Helper: Get color index class
  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'consultation': return 'bg-blue-600';
      case 'lab': return 'bg-teal-500';
      case 'pharmacy': return 'bg-emerald-500';
      case 'ot': return 'bg-indigo-600';
      default: return 'bg-slate-400';
    }
  };

  // SVG Line Chart Drawer (Revenue trend over time)
  const renderRevenueLineChart = () => {
    if (!revenueData || revenueData.daily_revenue.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          No financial data recorded in this range.
        </div>
      );
    }

    const data = revenueData.daily_revenue;
    const width = 600;
    const height = 220;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map(d => d.amount), 500);

    // Map data points
    const points = data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.amount / maxVal) * chartHeight;
      return { x, y, label: d.date, value: `INR ${d.amount.toLocaleString()}` };
    });

    // Create Path String
    let pathD = '';
    let fillD = '';
    
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      points.forEach((p, i) => {
        if (i > 0) pathD += ` L ${p.x} ${p.y}`;
      });

      // Gradient Fill Path closure
      fillD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return (
      <div className="relative">
        <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {/* Grids and Axes */}
          <line 
            x1={paddingLeft} 
            y1={paddingTop} 
            x2={width - paddingRight} 
            y2={paddingTop} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
          <line 
            x1={paddingLeft} 
            y1={paddingTop + chartHeight / 2} 
            x2={width - paddingRight} 
            y2={paddingTop + chartHeight / 2} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
          <line 
            x1={paddingLeft} 
            y1={paddingTop + chartHeight} 
            x2={width - paddingRight} 
            y2={paddingTop + chartHeight} 
            stroke="#e2e8f0" 
            strokeWidth="1.5" 
          />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 10} y={paddingTop + 5} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            {Math.round(maxVal).toLocaleString()}
          </text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 3} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            {Math.round(maxVal / 2).toLocaleString()}
          </text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight + 3} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            0
          </text>

          {/* Area Fill Gradient */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {points.length > 1 && (
            <path d={fillD} fill="url(#areaGrad)" />
          )}

          {/* Path Line */}
          {points.length > 1 && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#0d9488" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            // Label rendering filter to prevent overlap (render up to 5 dates)
            const showLabel = idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2) || (points.length > 6 && (idx === Math.floor(points.length / 4) || idx === Math.floor(3 * points.length / 4)));
            if (!showLabel) return null;
            return (
              <text 
                key={idx} 
                x={p.x} 
                y={paddingTop + chartHeight + 18} 
                textAnchor="middle" 
                className="text-[9px] font-semibold fill-slate-400"
              >
                {p.label.substring(5)}
              </text>
            );
          })}

          {/* Hover Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={p.x === hoveredPoint?.x ? "6" : "3.5"}
              fill={p.x === hoveredPoint?.x ? "#0d9488" : "#ffffff"}
              stroke="#0d9488"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-100"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-slate-900 text-white rounded-lg p-2.5 shadow-lg border border-slate-700 text-xs pointer-events-none transition-all duration-100"
            style={{ 
              left: `${(hoveredPoint.x / width) * 100}%`, 
              top: `${(hoveredPoint.y / height) * 100 - 32}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold text-[10px] uppercase text-teal-400">{hoveredPoint.label}</div>
            <div className="font-semibold text-white mt-0.5">{hoveredPoint.value}</div>
          </div>
        )}
      </div>
    );
  };

  // SVG Bar Chart Drawer (Patient visits frequency)
  const renderVisitsBarChart = () => {
    if (!operationalData || operationalData.daily_visits.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          No operational data recorded in this range.
        </div>
      );
    }

    const data = operationalData.daily_visits;
    const width = 600;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map(d => d.count), 5);

    // Grid details
    const barWidth = Math.max(4, (chartWidth / data.length) - 8);

    return (
      <div className="relative">
        <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {/* Y Axis Grid */}
          <line 
            x1={paddingLeft} 
            y1={paddingTop} 
            x2={width - paddingRight} 
            y2={paddingTop} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
          <line 
            x1={paddingLeft} 
            y1={paddingTop + chartHeight / 2} 
            x2={width - paddingRight} 
            y2={paddingTop + chartHeight / 2} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
          <line 
            x1={paddingLeft} 
            y1={paddingTop + chartHeight} 
            x2={width - paddingRight} 
            y2={paddingTop + chartHeight} 
            stroke="#e2e8f0" 
            strokeWidth="1.5" 
          />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 10} y={paddingTop + 5} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            {Math.round(maxVal)}
          </text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 3} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            {Math.round(maxVal / 2)}
          </text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight + 3} textAnchor="end" className="text-[10px] font-semibold fill-slate-400">
            0
          </text>

          {/* Bars */}
          {data.map((d, i) => {
            const x = paddingLeft + (i / data.length) * chartWidth + 4;
            const barHeight = (d.count / maxVal) * chartHeight;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill="#0284c7"
                  className="cursor-pointer hover:fill-sky-500 transition-colors"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPoint({
                      x: x + barWidth / 2,
                      y,
                      label: d.date,
                      value: `${d.count} Visits`
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Date Label (conditional rendering) */}
                {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
                  <text
                    x={x + barWidth / 2}
                    y={paddingTop + chartHeight + 18}
                    textAnchor="middle"
                    className="text-[9px] font-semibold fill-slate-400"
                  >
                    {d.date.substring(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-slate-900 text-white rounded-lg p-2.5 shadow-lg border border-slate-700 text-xs pointer-events-none transition-all duration-100"
            style={{ 
              left: `${(hoveredPoint.x / width) * 100}%`, 
              top: `${(hoveredPoint.y / height) * 100 - 32}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold text-[10px] uppercase text-sky-400">{hoveredPoint.label}</div>
            <div className="font-semibold text-white mt-0.5">{hoveredPoint.value}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm">Review operational workflows, patient visit patterns, and financial performance registries.</p>
        </div>
        
        {/* Quick Filter Actions */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => applyPreset(7)} 
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Last 7 Days
          </button>
          <button 
            onClick={() => applyPreset(30)} 
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Last 30 Days
          </button>
          <button 
            onClick={() => applyPreset(0)} 
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            This Month
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleApplyFilters} className="flex flex-wrap md:flex-nowrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md w-full md:w-auto"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
            <span>Apply Filter</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('finance')}
            className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'finance'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            Financial Performance
          </button>
          <button
            onClick={() => setActiveTab('ops')}
            className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'ops'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            Clinical Operations
          </button>
        </nav>
      </div>

      {/* Financial Metrics Dashboard */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-teal-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aggregate Revenue</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  INR {revenueData ? revenueData.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billing Entries</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {revenueData ? revenueData.daily_revenue.reduce((acc, curr) => acc + (curr.amount > 0 ? 1 : 0), 0) : '0'} Days
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Categories</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {revenueData ? revenueData.revenue_by_category.filter(c => c.amount > 0).length : '0'} Groups
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center">
                Financial Revenue Trend (Line Chart)
              </h3>
              {renderRevenueLineChart()}
            </div>

            {/* Billing Category Split */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6">
                Billing Category Allocation
              </h3>
              {revenueData && revenueData.revenue_by_category.length > 0 ? (
                <div className="space-y-4">
                  {revenueData.revenue_by_category.map((item, idx) => {
                    const total = revenueData.total_revenue || 1;
                    const percentage = Math.round((item.amount / total) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span>{formatCategory(item.category)}</span>
                          <span className="font-bold">INR {item.amount.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getCategoryColor(item.category)} rounded-full`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-400 text-sm py-12">No category allocations found.</div>
              )}
            </div>
          </div>

          {/* Groupings Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Doctor */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Revenue Collections by Consultant</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {revenueData && revenueData.revenue_by_doctor.length > 0 ? (
                  revenueData.revenue_by_doctor.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center px-6 py-3.5 text-sm hover:bg-slate-50 transition-colors">
                      <span className="font-bold text-slate-700">{doc.doctor_name}</span>
                      <span className="font-semibold text-slate-600">INR {doc.amount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-slate-400 text-xs">No consulting billing recorded.</div>
                )}
              </div>
            </div>

            {/* Revenue by Branch */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Revenue Contribution by Facility Branch</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {revenueData && revenueData.revenue_by_branch.length > 0 ? (
                  revenueData.revenue_by_branch.map((b, idx) => (
                    <div key={idx} className="flex justify-between items-center px-6 py-3.5 text-sm hover:bg-slate-50 transition-colors">
                      <span className="font-bold text-slate-700">{b.branch_name}</span>
                      <span className="font-semibold text-slate-600">INR {b.amount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-slate-400 text-xs">No facility branch payments found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Operations Dashboard */}
      {activeTab === 'ops' && (
        <div className="space-y-6">
          {/* Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-sky-50 rounded-lg">
                <Calendar className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Consultations</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {operationalData ? operationalData.total_visits_count : '0'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Patients</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {operationalData ? operationalData.unique_patients_count : '0'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Consult Duration</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {operationalData ? `${operationalData.average_consultation_time_mins}m` : '0m'}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-violet-50 rounded-lg">
                <Clock className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Lab Turnaround</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {operationalData ? `${operationalData.average_lab_turnaround_time_mins}m` : '0m'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center">
                Patient Visit Frequency (Bar Chart)
              </h3>
              {renderVisitsBarChart()}
            </div>

            {/* Operations Summary Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6">
                  Workflow Efficiency Analysis
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-semibold">Average Visits / Patient</span>
                    <span className="font-bold text-slate-800">{operationalData ? operationalData.average_visits_per_patient : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-semibold">Completed Consultations</span>
                    <span className="font-bold text-slate-800">{operationalData ? operationalData.total_visits_count : '0'} Visits</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-3">
                    <span className="text-slate-500 font-semibold">Triage Patient Coverage</span>
                    <span className="font-bold text-emerald-600">100%</span>
                  </div>
                </div>
              </div>

              {/* Clinic Tips Alert */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-4 flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Workflow Tip:</strong> Turnaround times are calculated based on active EMR session start/end timelines and lab sample checkout limits. Focus nurses on vitals inputs to optimize consult queuing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;
