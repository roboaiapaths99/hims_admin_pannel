import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { SkeletonTable } from '../../components/Skeleton';
import { 
  Pill, Search, CheckCircle, Clock, Play, FileText, 
  Loader2, AlertCircle, RefreshCw, Eye 
} from 'lucide-react';

interface PrescriptionItem {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity_prescribed: number;
}

interface Prescription {
  id: string;
  patient_id: string;
  visit_id: string;
  items: PrescriptionItem[];
  status: 'pending' | 'dispensed' | 'cancelled';
  doctor_name: string;
  patient_name: string;
  created_at: string;
}

export const PharmacyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'dispensed' | 'cancelled'>('pending');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Viewer Modal
  const [selectedPresc, setSelectedPresc] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [activeTab]);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/pharmacy/prescriptions', {
        params: { status: activeTab }
      });
      setPrescriptions(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve e-prescriptions worklist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQuickView = (presc: Prescription) => {
    setSelectedPresc(presc);
    setIsModalOpen(true);
  };

  const filteredPrescriptions = prescriptions.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Pill className="h-6 w-6 text-teal-600 mr-2" /> Pharmacy Dispense Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track patient e-prescriptions, select stock batches, and record medicine dispensations.</p>
        </div>
        <button
          onClick={fetchPrescriptions}
          className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Refresh Queue
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs and search query */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Prescription status Tab filters */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'pending' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Pending Dispenses
          </button>
          <button
            onClick={() => setActiveTab('dispensed')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'dispensed' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Dispensed Logs
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${
              activeTab === 'cancelled' 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Cancelled Prescriptions
          </button>
        </div>

        {/* High-density search bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, doctor, or prescription..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* Grid listing prescriptions */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">
            No e-prescriptions found matching the selected status.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-medium text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Prescribed Date</th>
                <th className="px-6 py-3.5">Prescription ID</th>
                <th className="px-6 py-3.5">Patient Name</th>
                <th className="px-6 py-3.5">Ordering Doctor</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map(presc => (
                <tr key={presc.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {new Date(presc.created_at).toLocaleDateString()}<br/>
                    {new Date(presc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-600">
                    #{presc.id.substring(18)}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/reception/patients/${presc.patient_id}`} className="font-bold text-teal-600 hover:text-teal-850 hover:underline">
                      {presc.patient_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{presc.doctor_name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {presc.items.length} Drug(s)
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {activeTab === 'pending' ? (
                      <button
                        onClick={() => navigate(`/pharmacy/dispense/${presc.id}`)}
                        className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow-sm cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Dispense Stock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenQuickView(presc)}
                        className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" /> View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick View Modal */}
      {isModalOpen && selectedPresc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden font-sans">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Prescription Details: {selectedPresc.patient_name}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  Reference Order: #{selectedPresc.id.substring(18)}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPresc(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
                    <th className="pb-1.5">Medicine</th>
                    <th className="pb-1.5">Dosage / Frequency</th>
                    <th className="pb-1.5">Duration</th>
                    <th className="pb-1.5 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPresc.items.map(item => (
                    <tr key={item.medicine_id} className="border-b border-slate-100 text-slate-600">
                      <td className="py-2 text-slate-800 font-bold">
                        {item.medicine_name}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">{item.instructions}</span>
                      </td>
                      <td className="py-2">{item.dosage} / {item.frequency}</td>
                      <td className="py-2">{item.duration}</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-700">{item.quantity_prescribed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPresc(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default PharmacyDashboard;
