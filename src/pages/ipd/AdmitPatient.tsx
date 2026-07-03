import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Building, User, ShieldAlert, ArrowLeft, Loader2, 
  Search, Bed, CreditCard, ChevronRight, CheckCircle 
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  gender: string;
  dob: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  hourly_rate: number;
  status: string;
}

export const AdmitPatient: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('0.00');

  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setIsLoadingMetadata(true);
    setError(null);
    try {
      // 1. Fetch doctors/staff
      const docRes = await apiClient.get('/api/org/users');
      const staffList = docRes.data;
      const docFilter = staffList.filter((u: any) => 
        ['doctor', 'surgeon', 'anesthetist'].includes(u.role)
      );
      setDoctors(docFilter);
      if (docFilter.length > 0) setSelectedDoctorId(docFilter[0].id);

      // 2. Fetch available rooms (excluding operating theatres)
      const roomRes = await apiClient.get('/api/config/rooms');
      const filteredRooms = roomRes.data.filter((r: any) => 
        r.room_type !== 'OT' && r.status === 'available'
      );
      setRooms(filteredRooms);
      if (filteredRooms.length > 0) setSelectedRoomId(filteredRooms[0].id);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch rooms and doctors metadata.');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handlePatientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearch.trim()) return;
    
    setIsLoadingPatients(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/patients', {
        params: { query: patientSearch }
      });
      setPatients(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to query patient database.');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatients([]);
    setPatientSearch('');
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a patient to admit.');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please assign an admitting doctor.');
      return;
    }
    if (!selectedRoomId) {
      setError('Please select a bed/room to allocate.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctorId,
        room_id: selectedRoomId,
        initial_deposit: parseFloat(initialDeposit) || 0.0,
        admission_date: new Date().toISOString()
      };
      await apiClient.post('/api/ipd/admissions', payload);
      navigate('/ipd/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to complete admission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/ipd/dashboard')}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Record IPD Bed Admission</h1>
          <p className="text-slate-500 text-xs">Verify patient clinical details, designate an attending doctor, and allocate bed accommodations.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Selection Left Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
              <User className="h-4.5 w-4.5 text-teal-600 mr-1.5" /> 1. Search Patient
            </h3>
            
            <form onSubmit={handlePatientSearch} className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Name, MRN or mobile..."
                className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-teal-600 cursor-pointer"
              >
                {isLoadingPatients ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </form>

            {patients.length > 0 && (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 flex flex-col"
                  >
                    <span>{p.first_name} {p.last_name}</span>
                    <span className="text-teal-600 text-[10px]">MRN: {p.mrn}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedPatient ? (
              <div className="bg-teal-50/50 border border-teal-200 rounded-lg p-4 space-y-2">
                <div className="text-xs font-bold text-teal-800 flex items-center">
                  <CheckCircle className="h-4 w-4 text-teal-600 mr-1.5" /> Selected Patient
                </div>
                <div className="text-sm font-extrabold text-slate-800">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                  <div>MRN: {selectedPatient.mrn}</div>
                  <div>Phone: {selectedPatient.phone}</div>
                  <div>Gender: {selectedPatient.gender} | DOB: {selectedPatient.dob}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer block mt-1"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">
                No patient selected
              </div>
            )}
          </div>
        </div>

        {/* Admission Form Details Right Panel */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center mb-6">
            <Building className="h-4.5 w-4.5 text-teal-600 mr-1.5" /> 2. Admission Parameters
          </h3>

          <form onSubmit={handleAdmitSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Admitting / Attending Doctor</label>
                {isLoadingMetadata ? (
                  <div className="py-2.5 flex items-center text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading clinical staff...
                  </div>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {doctors.length === 0 ? (
                      <option value="">No doctors available</option>
                    ) : (
                      doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.role.replace('_', ' ')})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Bed / Room Allocation</label>
                {isLoadingMetadata ? (
                  <div className="py-2.5 flex items-center text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading beds...
                  </div>
                ) : (
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {rooms.length === 0 ? (
                      <option value="">No beds available</option>
                    ) : (
                      rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} - {r.room_type} (₹{r.hourly_rate.toFixed(2)}/day)
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Initial Admission Deposit (INR)</label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Admission Date & Time</label>
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleString()}
                  className="mt-1.5 block w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/ipd/dashboard')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-sm font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPatient}
                className="inline-flex justify-center items-center px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> Booking Admission...
                  </>
                ) : (
                  'Confirm Bed Admission'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdmitPatient;
