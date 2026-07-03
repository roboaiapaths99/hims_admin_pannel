import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Calendar as CalendarIcon, User, Layers, Info, CheckCircle, Clock, 
  Activity, Plus, ShieldCheck, AlertCircle, Eye, ClipboardList, HelpCircle, Loader2
} from 'lucide-react';

interface OTBooking {
  id: string;
  patient_name: string;
  patient_mrn: string;
  surgery_name: string;
  surgeon_name: string;
  anesthetist_name: string;
  room_number: string;
  schedule_date: string;
  status: 'planned' | 'pre_op_pending' | 'in_surgery' | 'completed' | 'cancelled';
}

interface Room {
  id: string;
  room_number: string;
}

export const OTDashboard: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [bookings, setBookings] = useState<OTBooking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedRoom, selectedStatus]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Load active bookings
      const params: Record<string, string> = {};
      if (selectedRoom) params.room_id = selectedRoom;
      if (selectedStatus) params.status_filter = selectedStatus;
      
      const bookingsRes = await apiClient.get('/api/ot/bookings', { params });
      setBookings(bookingsRes.data);

      // 2. Load configured rooms
      const roomsRes = await apiClient.get('/api/config/rooms');
      setRooms(roomsRes.data.filter((r: any) => r.room_type === 'OT' || r.room_type === 'ot'));
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve Operation Theater bookings log.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await apiClient.put(`/api/ot/bookings/${bookingId}/status`, { status: newStatus });
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update surgery session status.');
    }
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Activity className="h-6 w-6 text-teal-600 mr-2" /> Operating Theater Scheduler board
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage surgical reservations, WHO pre-op checklists, anesthesia notes, and consumables deductions.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/ot/booking/new')}
            className="inline-flex items-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer border-0"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Surgery
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs font-semibold text-slate-600">
        <div className="flex flex-col space-y-1 w-full sm:w-48">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Filter OT Room</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">All OT Rooms</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>Room {r.room_number}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col space-y-1 w-full sm:w-48">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="planned">📅 Planned</option>
            <option value="pre_op_pending">📋 Pre-Op Checklist</option>
            <option value="in_surgery">🏥 In Surgery</option>
            <option value="completed">✅ Completed</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings registry timeline */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic font-semibold shadow-sm">
          No surgical bookings recorded under selected filters. Click "Schedule Surgery" to book a slot.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map(b => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
              
              {/* Header card info */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px] uppercase tracking-wide text-slate-500">
                      {b.room_number}
                    </span>
                    <h4 className="font-black text-slate-800 text-sm mt-1.5 line-clamp-1">{b.surgery_name}</h4>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wider ${
                    b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    b.status === 'in_surgery' ? 'bg-teal-50 text-teal-700 border-teal-200 animate-pulse' :
                    b.status === 'pre_op_pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    b.status === 'cancelled' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Patient / Doctor Details */}
                <div className="space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Patient:</span>
                    <span className="text-slate-700">{b.patient_name} <span className="font-mono text-[10px] text-slate-400">({b.patient_mrn})</span></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Surgeon:</span>
                    <span className="text-slate-700">Dr. {b.surgeon_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">Anesthetist:</span>
                    <span className="text-slate-700">Dr. {b.anesthetist_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Date & Time:</span>
                    <span className="text-slate-700 flex items-center font-mono text-[11px]">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {new Date(b.schedule_date).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions & Checklist Buttons Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex flex-wrap gap-2 justify-between items-center text-xs font-bold print:hidden">
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => navigate(`/ot/checklist/${b.id}`)}
                    className="inline-flex items-center px-2 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 bg-white rounded cursor-pointer"
                    title="WHO safety checklist"
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1 text-teal-600" /> Checklist
                  </button>

                  <button
                    onClick={() => navigate(`/ot/notes/${b.id}`)}
                    className="inline-flex items-center px-2 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 bg-white rounded cursor-pointer"
                    title="Surgical reports & consumables"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" /> Reports
                  </button>
                </div>

                {/* Status Transitions Selector */}
                {b.status !== 'completed' && b.status !== 'cancelled' && (
                  <select
                    value={b.status}
                    onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="pre_op_pending">Pre-Op</option>
                    <option value="in_surgery">In Surgery</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancel</option>
                  </select>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default OTDashboard;
