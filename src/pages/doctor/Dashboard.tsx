import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, getSocketUrl } from '../../api/client';
import { Alert } from '../../components/Alert';
import { SkeletonTable, SkeletonCard } from '../../components/Skeleton';
import { 
  Stethoscope, Users, Loader2, AlertCircle, RefreshCw, Play, Volume2, ChevronRight, Video, Calendar
} from 'lucide-react';
import io from 'socket.io-client';

interface QueueToken {
  id: string;
  appointment_id: string;
  token_number: string;
  status: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
}

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    fetchDoctorQueue();
    fetchDoctorStats();

    // Socket.IO sync with authentication
    const socketUrl = getSocketUrl();
    const token = localStorage.getItem('hmis_token');
    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token: token || undefined
      }
    });

    socket.on('queue.updated', () => {
      fetchDoctorQueue();
      fetchDoctorStats();
    });

    // Fallback polling
    const interval = setInterval(() => {
      fetchDoctorQueue();
      fetchDoctorStats();
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchDoctorStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await apiClient.get('/api/reports/dashboard-summary');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load doctor stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchDoctorQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/appointments/queue');
      // Doctors should see patients ready_for_doctor or in_consultation
      const doctorQueue = res.data.filter((t: QueueToken) => 
        ['ready_for_doctor', 'in_consultation'].includes(t.status)
      );
      setQueue(doctorQueue);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load consultation queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallPatient = (token: QueueToken) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance();
      msg.text = `Calling patient ${token.patient_name}, token number ${token.token_number.split('').join(' ')}, please proceed to consulting room.`;
      msg.rate = 0.85;
      window.speechSynthesis.speak(msg);
    }
  };

  const handleStartConsultation = async (token: QueueToken) => {
    setError(null);
    try {
      const res = await apiClient.post('/api/consultation/visit/start', {
        appointment_id: token.appointment_id
      });
      const visit = res.data;
      navigate(`/doctor/consultation/${visit.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start consultation visit.');
    }
  };

  const handleStartTeleconsultation = async (token: QueueToken) => {
    setError(null);
    try {
      const roomRes = await apiClient.post('/api/telemedicine/create-room', {
        appointment_id: token.appointment_id
      });
      const session = roomRes.data;

      // Start the EMR visit if it doesn't exist
      await apiClient.post('/api/consultation/visit/start', {
        appointment_id: token.appointment_id
      });

      navigate(`/doctor/teleconsultation/${session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start telemedicine session.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">EMR Consultation Workspace</h1>
          <p className="text-slate-500 text-sm">Review waiting patient files, call tokens, and document medical consultation notes.</p>
        </div>
        <button
          onClick={fetchDoctorQueue}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh Queue
        </button>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Doctor Stats Panel */}
      {isLoadingStats ? (
        <SkeletonCard />
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultations Done</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.doctor_consultations_done ?? 0}</p>
            </div>
            <div className="h-10 w-10 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Labs</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.doctor_pending_labs ?? 0}</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Rx (Pharm)</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.doctor_pending_rx ?? 0}</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OT Bookings Today</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.doctor_upcoming_ot ?? 0}</p>
            </div>
            <div className="h-10 w-10 bg-rose-50 text-rose-700 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Patient consultation directory */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
            <Stethoscope className="h-5 w-5 text-teal-600 mr-2" /> Consultation Queued Patients
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
            {queue.length} Awaiting Consult
          </span>
        </div>

        {isLoading && queue.length === 0 ? (
          <SkeletonTable rows={5} columns={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Token</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Announce</th>
                  <th className="px-6 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                      No patients currently checked in and triaged for consultation.
                    </td>
                  </tr>
                ) : (
                  queue.map((token) => (
                    <tr key={token.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-teal-700 font-mono">{token.token_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{token.patient_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{token.department_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          token.status === 'in_consultation' ? 'bg-teal-50 text-teal-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {token.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCallPatient(token)}
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 cursor-pointer inline-flex items-center"
                          title="Call / Voice Announce Patient"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-2">
                        <button
                          onClick={() => handleStartTeleconsultation(token)}
                          className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-bold shadow-sm cursor-pointer transition-all"
                        >
                          <Video className="h-3.5 w-3.5 mr-1.5" /> Teleconsult
                        </button>
                        <button
                          onClick={() => handleStartConsultation(token)}
                          className="inline-flex items-center px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer transition-all"
                        >
                          {token.status === 'in_consultation' ? 'Resume EMR' : 'Start EMR'} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </button>
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
export default DoctorDashboard;
