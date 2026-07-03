import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Building, UserPlus, Search, AlertCircle, Loader2, 
  Bed, ArrowRight, UserCheck, CheckCircle2, History 
} from 'lucide-react';

interface Admission {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  doctor_id: string;
  doctor_name: string;
  room_id: string;
  room_number: string;
  room_type: string;
  admission_date: string;
  discharge_date?: string;
  discharge_summary?: string;
  initial_deposit: number;
  status: 'admitted' | 'discharged';
}

export const IPDDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState<Admission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'admitted' | 'discharged'>('admitted');

  useEffect(() => {
    fetchAdmissions();
  }, [statusTab]);

  const fetchAdmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/ipd/admissions', {
        params: { status_filter: statusTab }
      });
      setAdmissions(res.data);
      filterList(res.data, searchQuery);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch IPD admission logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterList = (list: Admission[], query: string) => {
    if (!query) {
      setFilteredAdmissions(list);
      return;
    }
    const q = query.toLowerCase();
    const filtered = list.filter(
      (a) =>
        a.patient_name.toLowerCase().includes(q) ||
        a.patient_mrn.toLowerCase().includes(q) ||
        a.room_number.toLowerCase().includes(q) ||
        a.doctor_name.toLowerCase().includes(q)
    );
    setFilteredAdmissions(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    filterList(admissions, val);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center">
            <Building className="h-7 w-7 text-teal-600 mr-2.5" /> In-Patient Department (IPD) Registry
          </h1>
          <p className="text-slate-500 text-sm">Admit, transfer, track vitals, manage bed occupancy, and process ward billing details.</p>
        </div>
        <button
          onClick={() => navigate('/ipd/admit')}
          className="inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Admit New Patient
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs & Search controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex space-x-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusTab('admitted')}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              statusTab === 'admitted'
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'text-slate-600 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <UserCheck className="h-4 w-4 inline mr-1.5" /> Active Admissions
          </button>
          <button
            onClick={() => setStatusTab('discharged')}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              statusTab === 'discharged'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'text-slate-600 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <History className="h-4 w-4 inline mr-1.5" /> Discharged History
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search name, MRN, room, or doctor..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* List Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            <p className="text-sm font-semibold text-slate-500">Loading IPD registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Info</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Room Allocation</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Admitting Doctor</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Admission Date</th>
                  {statusTab === 'discharged' && (
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Discharged Date</th>
                  )}
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan={statusTab === 'discharged' ? 6 : 5} className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                      No matching in-patient records found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/55 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{a.patient_name}</div>
                        <div className="text-xs font-semibold text-teal-600 tracking-wider">MRN: {a.patient_mrn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-bold text-slate-800">
                          <Bed className="h-4 w-4 text-teal-600 mr-1.5 flex-shrink-0" />
                          Room {a.room_number}
                        </div>
                        <div className="text-xs text-slate-500">{a.room_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">
                        {a.doctor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(a.admission_date).toLocaleString()}
                      </td>
                      {statusTab === 'discharged' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {a.discharge_date ? new Date(a.discharge_date).toLocaleString() : 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                        {a.status === 'admitted' ? (
                          <>
                            <button
                              onClick={() => navigate(`/ipd/workspace/${a.id}`)}
                              className="inline-flex items-center px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Workspace <ArrowRight className="h-3 w-3 ml-1" />
                            </button>
                            <button
                              onClick={() => navigate(`/ipd/discharge/${a.id}`)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Discharge
                            </button>
                          </>
                        ) : (
                          <div className="inline-flex items-center text-slate-500 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 mr-1" /> Discharged
                          </div>
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
    </div>
  );
};

export default IPDDashboard;
