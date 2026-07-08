import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { Alert } from '../../components/Alert';
import { SkeletonTable } from '../../components/Skeleton';
import { 
  Activity, Users, Play, Clock, AlertCircle, Loader2, CheckCircle2, 
  HelpCircle, UserCheck, Stethoscope, RefreshCw, Volume2
} from 'lucide-react';
import io from 'socket.io-client';

interface QueueToken {
  id: string;
  appointment_id: string;
  token_number: string;
  status: string;
  assigned_at: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
}

export const Queue: React.FC = () => {
  const { currentBranchId } = useAuthStore();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();

    // Setup Socket.IO Client
    const socketUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      if (currentBranchId) {
        socket.emit('join_branch', currentBranchId);
      }
    });

    socket.on('queue.updated', () => {
      fetchQueue();
    });

    // Fallback polling every 10 seconds
    const interval = setInterval(fetchQueue, 10000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [currentBranchId]);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/api/appointments/queue');
      setTokens(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch active token queue.');
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-speech for patient announcements
  const handleAnnounceToken = (token: QueueToken) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance();
      msg.text = `Token number ${token.token_number.split('').join(' ')}, please proceed to ${token.doctor_name}'s consulting chamber`;
      msg.rate = 0.85;
      window.speechSynthesis.speak(msg);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">OPD Token Queue Board</h1>
          <p className="text-slate-500 text-sm">Real-time status check-in list of patients progressing from vitals to consultation chambers.</p>
        </div>
        <button
          onClick={fetchQueue}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh Board
        </button>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Grid: 4-Columns representing each step of the OPD Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Step 1: Checked In / Waiting */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Clock className="h-4 w-4 mr-2 text-slate-500" /> 1. Checked In
            </h3>
            <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tokens.filter(t => t.status === 'waiting').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tokens.filter(t => t.status === 'waiting').map(token => (
              <div key={token.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 relative hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-teal-700 font-mono">{token.token_number}</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase">Waiting</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{token.patient_name}</h4>
                <div className="text-[10px] text-slate-500 font-semibold">{token.department_name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Recording Vitals */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center">
              <Activity className="h-4 w-4 mr-2 text-amber-500" /> 2. Vitals Triage
            </h3>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tokens.filter(t => t.status === 'in_vitals').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tokens.filter(t => t.status === 'in_vitals').map(token => (
              <div key={token.id} className="bg-amber-50/30 border border-amber-100 rounded-lg p-3 space-y-2 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-amber-800 font-mono">{token.token_number}</span>
                  <span className="text-[9px] font-extrabold text-amber-600 uppercase">Triage</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{token.patient_name}</h4>
                <div className="text-[10px] text-slate-500 font-semibold">{token.department_name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Ready for Doctor */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center">
              <UserCheck className="h-4 w-4 mr-2 text-emerald-600" /> 3. Doctor Ready
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tokens.filter(t => t.status === 'ready_for_doctor').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tokens.filter(t => t.status === 'ready_for_doctor').map(token => (
              <div key={token.id} className="bg-emerald-50/20 border border-emerald-100 rounded-lg p-3 space-y-2 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-emerald-700 font-mono">{token.token_number}</span>
                  <button
                    onClick={() => handleAnnounceToken(token)}
                    className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer transition-all"
                    title="Announce Patient"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{token.patient_name}</h4>
                <div className="text-[10px] text-slate-600 font-bold">Doc: {token.doctor_name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Active Consultation */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center">
              <Stethoscope className="h-4 w-4 mr-2 text-teal-600" /> 4. In Consultation
            </h3>
            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tokens.filter(t => t.status === 'in_consultation').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tokens.filter(t => t.status === 'in_consultation').map(token => (
              <div key={token.id} className="bg-teal-50/20 border border-teal-100 rounded-lg p-3 space-y-2 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-teal-700 font-mono">{token.token_number}</span>
                  <span className="text-[9px] font-extrabold text-teal-600 uppercase">Consulting</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{token.patient_name}</h4>
                <div className="text-[10px] text-slate-600 font-bold">Doc: {token.doctor_name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
export default Queue;
