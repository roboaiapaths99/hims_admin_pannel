import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, Calendar, User, Save, Loader2, AlertCircle, 
  Search, Layers, Landmark, ShieldAlert, CheckCircle
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
}

export const BookSurgery: React.FC = () => {
  const navigate = useNavigate();

  // Roster/Configuration cache
  const [patients, setPatients] = useState<Patient[]>([]);
  const [surgeons, setSurgeons] = useState<Staff[]>([]);
  const [anesthetists, setAnesthetists] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Search Patients state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form parameters
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeonId, setSurgeonId] = useState('');
  const [anesthetistId, setAnesthetistId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  // Statuses
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRosterAndRooms();
  }, []);

  // Search patients on typing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (patientSearch.trim().length > 1) {
        performPatientSearch();
      } else {
        setPatientSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientSearch]);

  const loadRosterAndRooms = async () => {
    try {
      // 1. Fetch staff roster
      const usersRes = await apiClient.get('/api/org/users');
      const roster: Staff[] = usersRes.data;
      
      setSurgeons(roster.filter(u => u.role === 'surgeon' || u.role === 'doctor'));
      setAnesthetists(roster.filter(u => u.role === 'anesthetist' || u.role === 'doctor'));

      // 2. Fetch OT rooms
      const roomsRes = await apiClient.get('/api/config/rooms');
      setRooms(roomsRes.data.filter((r: any) => r.room_type === 'OT' || r.room_type === 'ot'));
    } catch (err) {
      console.error('Failed to load roster configuration data', err);
    }
  };

  const performPatientSearch = async () => {
    setIsSearchingPatients(true);
    try {
      const res = await apiClient.get('/api/patients', { params: { q: patientSearch } });
      setPatientSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatientSuggestions([]);
  };

  const handleBookSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a patient first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      patient_id: selectedPatient.id,
      surgery_name: surgeryName,
      surgeon_id: surgeonId,
      anesthetist_id: anesthetistId,
      room_id: roomId,
      schedule_date: new Date(scheduleDate).toISOString()
    };

    try {
      await apiClient.post('/api/ot/bookings', payload);
      setSuccess('Surgical slot reserved successfully.');
      setTimeout(() => {
        navigate('/ot/dashboard');
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to book surgery schedule slot.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/ot/dashboard')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer border-0 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono font-sans">OT RESERVATION WIZARD</span>
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

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleBookSurgery} className="space-y-5 text-xs font-semibold">
          
          {/* Patient Selection Dropdown search */}
          <div className="space-y-1.5 relative font-sans">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">1. Select Patient</label>
            {selectedPatient ? (
              <div className="bg-slate-900 text-white rounded-lg p-3 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">{selectedPatient.first_name} {selectedPatient.last_name}</h4>
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">MRN: {selectedPatient.mrn} &bull; Phone: {selectedPatient.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-400 hover:text-white font-bold text-sm bg-transparent border-0 cursor-pointer"
                >
                  &times; Remove
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by MRN, Name, or Phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-xs"
                />

                {isSearchingPatients && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                  </div>
                )}

                {patientSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                    {patientSuggestions.map(pat => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => handleSelectPatient(pat)}
                        className="w-full text-left px-4 py-2 border-b border-slate-100 hover:bg-slate-50 flex justify-between font-semibold cursor-pointer bg-white"
                      >
                        <span>{pat.first_name} {pat.last_name}</span>
                        <span className="text-slate-400 font-mono">{pat.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Procedure details */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Surgery Procedure Name</label>
            <input
              type="text"
              placeholder="e.g. Laparoscopic Cholecystectomy, Appendectomy"
              required
              value={surgeryName}
              onChange={(e) => setSurgeryName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
            />
          </div>

          {/* Grid for Roster allocation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">3. Primary Surgeon</label>
              <select
                required
                value={surgeonId}
                onChange={(e) => setSurgeonId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
              >
                <option value="">Select Surgeon</option>
                {surgeons.map(s => (
                  <option key={s.id} value={s.id}>Dr. {s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">4. Dedicated Anesthetist</label>
              <select
                required
                value={anesthetistId}
                onChange={(e) => setAnesthetistId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
              >
                <option value="">Select Anesthetist</option>
                {anesthetists.map(a => (
                  <option key={a.id} value={a.id}>Dr. {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Room and Date details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">5. Operating Room Allocation</label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800"
              >
                <option value="">Select Operating Room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>OT Room {r.room_number}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">6. Schedule Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                  Checking availability & saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Schedule & Reserve Slot
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BookSurgery;
