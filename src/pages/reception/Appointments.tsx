import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField, SelectField } from '../../components/FormField';
import { SkeletonTable } from '../../components/Skeleton';
import { 
  Calendar, Clock, User, Search, Plus, AlertCircle, Loader2, 
  CheckCircle2, XCircle, ChevronRight, Filter, Building, UserCheck, Download 
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Doctor {
  id: string;
  name: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  mrn: string;
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason?: string;
}

export const Appointments: React.FC = () => {
  // Lists
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Dynamic patient search inside booking form
  const [patientSearch, setPatientSearch] = useState('');
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoctor, setFilterDoctor] = useState('');

  // Loader states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingStartTime, setBookingStartTime] = useState('09:00');
  const [bookingEndTime, setBookingEndTime] = useState('09:30');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [reason, setReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [referringDoctors, setReferringDoctors] = useState<any[]>([]);
  const [referredByDoctorId, setReferredByDoctorId] = useState('');

  // Form validation state
  const [bookingErrors, setBookingErrors] = useState<Record<string, string | null>>({
    patientId: null,
    doctorId: null,
    deptId: null,
    date: null,
    startTime: null,
    reason: null
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (filterDate) {
      fetchAppointments();
    }
  }, [filterDate, filterDoctor]);

  const fetchMetadata = async () => {
    try {
      // 1. Fetch departments
      const deptRes = await apiClient.get('/api/config/departments');
      setDepartments(deptRes.data);
      if (deptRes.data.length > 0) setSelectedDeptId(deptRes.data[0].id);

      // 2. Fetch staff/doctors
      const staffRes = await apiClient.get('/api/org/users');
      const docList = staffRes.data.filter((u: any) => 
        ['doctor', 'surgeon', 'anesthetist'].includes(u.role)
      );
      setDoctors(docList);
      if (docList.length > 0) setSelectedDoctorId(docList[0].id);

      // 3. Fetch referring doctors
      const refDocsRes = await apiClient.get('/api/referrals/doctors');
      setReferringDoctors(refDocsRes.data);

    } catch (err) {
      console.error('Failed to load form metadata:', err);
    }
  };

  const exportToCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Time Slot', 'Patient Name', 'MRN ID', 'Assigned Doctor', 'Department', 'Status', 'Reason'];
    const rows = appointments.map(appt => [
      `${appt.start_time} - ${appt.end_time}`,
      appt.patient_name,
      appt.mrn,
      appt.doctor_name,
      appt.department_name,
      appt.status,
      appt.reason || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `appointments_export_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { date: filterDate };
      if (filterDoctor) params.doctor_id = filterDoctor;
      
      const res = await apiClient.get('/api/appointments', { params });
      setAppointments(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger patient query
  const handlePatientSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientSearch(val);
    if (val.length < 2) {
      setSearchedPatients([]);
      return;
    }
    
    setIsSearchingPatients(true);
    try {
      const res = await apiClient.get('/api/patients', { params: { q: val } });
      setSearchedPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please search and select a patient first.');
      return;
    }

    setIsBooking(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctorId,
        department_id: selectedDeptId,
        appointment_date: new Date(bookingDate).toISOString(),
        start_time: bookingStartTime,
        end_time: bookingEndTime,
        reason: reason || undefined,
        referred_by_doctor_id: referredByDoctorId || undefined
      };

      await apiClient.post('/api/appointments', payload);
      setSuccessMsg(`OPD Slot booked for ${selectedPatient.first_name} successfully!`);
      
      // Reset form
      setSelectedPatient(null);
      setPatientSearch('');
      setReason('');
      setReferredByDoctorId('');
      setSearchedPatients([]);
      
      // Refresh appointments list
      await fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to book slot.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post(`/api/appointments/${appointmentId}/check-in`);
      setSuccessMsg(`Patient checked in. Assigned Token: ${res.data.token_number}`);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process check-in.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">OPD Appointments Schedule</h1>
          <p className="text-slate-500 text-sm">Schedule outpatient consultations, track arrivals, and generate check-in tokens.</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={appointments.length === 0}
          className="inline-flex items-center px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-2" /> Export Schedule
        </button>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {successMsg && (
        <Alert type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left & Center: Schedule Listing Dashboard */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Calendar filter controller */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-550/30 text-slate-700"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All OPD Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Appointments Grid Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
                <Clock className="h-4.5 w-4.5 text-teal-600 mr-2" /> Booking Schedule Listing
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                {appointments.length} Slot(s)
              </span>
            </div>

            {isLoading ? (
              <SkeletonTable rows={8} columns={6} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Time Slot</th>
                      <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Patient (MRN)</th>
                      <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No appointments booked for this date.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700 font-mono">
                            {app.start_time} - {app.end_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{app.patient_name}</div>
                            <div className="text-[10px] font-semibold text-slate-400 font-mono">{app.mrn}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">{app.doctor_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{app.department_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              app.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                              app.status === 'waiting' ? 'bg-amber-50 text-amber-700' :
                              app.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {app.status === 'scheduled' ? (
                              <button
                                onClick={() => handleCheckIn(app.id)}
                                className="inline-flex items-center px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                              >
                                <UserCheck className="h-3 w-3 mr-1" /> Check In
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">Checked In</span>
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

        {/* Right Pane: Booking Slot Workspace Form */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-fit">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Book OPD Appointment</h3>
          </div>

          <form onSubmit={handleBookAppointment} className="space-y-4">
            
            {/* Search Patient Box */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Search Patient</label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type Name, Phone or MRN..."
                  value={patientSearch}
                  onChange={handlePatientSearchChange}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              {isSearchingPatients && (
                <div className="absolute right-2 top-8">
                  <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                </div>
              )}

              {/* Suggestions Panel */}
              {searchedPatients.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 text-xs">
                  {searchedPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearch(`${p.first_name} ${p.last_name} (${p.mrn})`);
                        setSearchedPatients([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 flex justify-between"
                    >
                      <span className="font-semibold">{p.first_name} {p.last_name}</span>
                      <span className="text-slate-400 font-mono">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="bg-teal-50 border border-teal-200 text-teal-800 p-2.5 rounded-lg text-[11px] font-semibold flex justify-between">
                <span>Selected: {selectedPatient.first_name} {selectedPatient.last_name}</span>
                <span className="font-mono">{selectedPatient.mrn}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">OPD Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Consulting Practitioner</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Appointment Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Start Time</label>
                <input
                  type="text"
                  required
                  value={bookingStartTime}
                  onChange={(e) => setBookingStartTime(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  placeholder="09:00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">End Time</label>
                <input
                  type="text"
                  required
                  value={bookingEndTime}
                  onChange={(e) => setBookingEndTime(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  placeholder="09:30"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Referring Doctor (Optional)</label>
              <select
                value={referredByDoctorId}
                onChange={(e) => setReferredByDoctorId(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">None / Self</option>
                {referringDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.hospital_name || 'External'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Chief Complaints / Reason</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-500"
                placeholder="Fever, cough, check-up..."
              />
            </div>

            <button
              type="submit"
              disabled={isBooking || !selectedPatient}
              className="w-full text-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
            >
              {isBooking ? <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> : null}
              Schedule OPD Consultation
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Appointments;
