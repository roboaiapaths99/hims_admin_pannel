import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField } from '../../components/FormField';
import { getPhoneError, validateDateOfBirth, getEmailError } from '../../utils/validation';
import { 
  Users, Search, UserPlus, FileText, Calendar, Plus, 
  AlertCircle, Loader2, CheckCircle2, ChevronRight, HelpCircle, Download 
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  dob: string;
  gender: string;
  blood_group?: string;
  address: string;
  photo_url?: string;
  abha_number?: string;
  abha_address?: string;
  consent_signed: boolean;
  created_at: string;
}

export const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  // ABHA Panel state
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referringDoctors, setReferringDoctors] = useState<any[]>([]);
  const [referredByDoctorId, setReferredByDoctorId] = useState('');
  
  // Duplicate check state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicatePatients, setDuplicatePatients] = useState<Patient[]>([]);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({
    firstName: null,
    lastName: null,
    phone: null,
    email: null,
    dob: null,
    emergencyPhone: null,
    address: null,
    emergencyName: null
  });

  useEffect(() => {
    fetchPatients();
    fetchReferringDoctors();
  }, []);

  const fetchReferringDoctors = async () => {
    try {
      const res = await apiClient.get('/api/referrals/doctors');
      setReferringDoctors(res.data);
    } catch (err) {
      console.error('Failed to load referring doctors:', err);
    }
  };

  const fetchPatients = async (query = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/patients', {
        params: query ? { q: query } : {}
      });
      setPatients(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load patients list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const exportToCSV = () => {
    if (patients.length === 0) return;
    const headers = ['MRN ID', 'First Name', 'Last Name', 'Phone', 'Email', 'DOB', 'Gender', 'Blood Group', 'Address', 'ABHA Number'];
    const rows = patients.map(p => [
      p.mrn,
      p.first_name,
      p.last_name,
      p.phone,
      p.email || '',
      p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
      p.gender,
      p.blood_group || '',
      p.address,
      p.abha_number || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patients_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegister = async (e?: React.FormEvent, forceBypass = false) => {
    if (e) e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string | null> = {
      firstName: !firstName.trim() ? 'First name is required' : null,
      lastName: !lastName.trim() ? 'Last name is required' : null,
      phone: getPhoneError(phone),
      email: email ? getEmailError(email) : null,
      dob: !dob ? 'Date of birth is required' : validateDateOfBirth(dob),
      emergencyName: !emergencyName.trim() ? 'Emergency contact name is required' : null,
      emergencyPhone: getPhoneError(emergencyPhone),
      address: !address.trim() ? 'Address is required' : null
    };

    setFormErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(err => err !== null);
    if (hasErrors) {
      setError('Please fix all validation errors above');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Duplicate check prior to registration
    if (!forceBypass) {
      try {
        const dupRes = await apiClient.get('/api/patients/duplicate-check', {
          params: {
            phone,
            name: `${firstName} ${lastName}`,
            dob
          }
        });
        if (dupRes.data && dupRes.data.length > 0) {
          setDuplicatePatients(dupRes.data);
          setShowDuplicateWarning(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Duplicate check query failed:', err);
      }
    }

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone,
        email: email?.trim() || undefined,
        dob: new Date(dob).toISOString(),
        gender,
        blood_group: bloodGroup || undefined,
        address: address.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone,
        abha_number: abhaNumber?.trim() || undefined,
        abha_address: abhaAddress?.trim() || undefined,
        consent_signed: consentSigned,
        referred_by_doctor_id: referredByDoctorId || undefined
      };

      const res = await apiClient.post('/api/patients', payload);
      const newPatient = res.data;

      // Reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setDob('');
      setGender('Male');
      setBloodGroup('O+');
      setAddress('');
      setEmergencyName('');
      setEmergencyPhone('');
      setAbhaNumber('');
      setAbhaAddress('');
      setConsentSigned(false);
      setReferredByDoctorId('');
      setFormErrors({});
      setShowRegisterForm(false);
      
      // Refresh list and navigate to detail page
      await fetchPatients();
      navigate(`/reception/patients/${newPatient.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register patient.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Patient Registry</h1>
          <p className="text-slate-500 text-sm">Search clinical medical records, register new patients, and link ABHA IDs.</p>
        </div>
        <div className="flex items-center space-x-3">
          {!showRegisterForm && (
            <button
              onClick={exportToCSV}
              disabled={patients.length === 0}
              className="inline-flex items-center px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </button>
          )}
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
          >
            {showRegisterForm ? 'View Registry Table' : (
              <>
                <UserPlus className="h-4 w-4 mr-2" /> Register New Patient
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <Alert 
          type="error"
          title="Registration Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {!showRegisterForm ? (
        <div className="space-y-4">
          {/* Search Workspace */}
          <form onSubmit={handleSearchSubmit} className="flex gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by Name, Phone Number, or MRN ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm transition-all cursor-pointer shadow-md"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchPatients('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Patient Registry Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
                <Users className="h-5 w-5 text-teal-600 mr-2" /> Patient Database Records
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Export CSV
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
                  {patients.length} Match(es) Found
                </span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">MRN ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Age/Gender</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Blood</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ABHA Details</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                          No patients matching criteria. Use the "Register New Patient" button to add a profile.
                        </td>
                      </tr>
                    ) : (
                      patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => navigate(`/reception/patients/${patient.id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-700 font-mono">{patient.mrn}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                            {patient.first_name} {patient.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{patient.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {calculateAge(patient.dob)} yrs / {patient.gender}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">{patient.blood_group || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {patient.abha_number ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Linked
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reception/patients/${patient.id}`);
                              }}
                              className="text-teal-600 hover:text-teal-800 inline-flex items-center font-bold"
                            >
                              Open Profile <ChevronRight className="h-4 w-4 ml-0.5" />
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
      ) : (
        /* Patient Registration Form Screen */
        <form onSubmit={handleRegister} className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Patient Demographics & Registration Form</h2>
            <p className="text-slate-500 text-xs">Fill details accurately matching Aadhaar or government identity certificates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Demographic Info */}
            <FormField
              label="First Name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setFormErrors(prev => ({ ...prev, firstName: null }));
              }}
              error={formErrors.firstName}
              required
              placeholder="Jane"
            />
            <FormField
              label="Last Name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setFormErrors(prev => ({ ...prev, lastName: null }));
              }}
              error={formErrors.lastName}
              required
              placeholder="Doe"
            />
            <FormField
              label="Mobile Number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFormErrors(prev => ({ ...prev, phone: null }));
              }}
              error={formErrors.phone}
              required
              maxLength={10}
              placeholder="9876543210"
              helperText="10-digit mobile number starting with 6-9"
            />
            <FormField
              label="Email Address (Optional)"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormErrors(prev => ({ ...prev, email: null }));
              }}
              error={formErrors.email}
              placeholder="jane.doe@example.com"
            />
            <FormField
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                setFormErrors(prev => ({ ...prev, dob: null }));
              }}
              error={formErrors.dob}
              required
            />
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Gender *</label>
              <select
                required
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Unknown / Pending</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Referring Doctor</label>
              <select
                value={referredByDoctorId}
                onChange={(e) => setReferredByDoctorId(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              >
                <option value="">None / Self</option>
                {referringDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.hospital_name || 'External'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Residential Address *</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setFormErrors(prev => ({ ...prev, address: null }));
                }}
                className={`mt-1.5 block w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none resize-none ${
                  formErrors.address
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
                }`}
                placeholder="Flat No, Street Name, City, State, ZIP..."
              />
              {formErrors.address && (
                <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.address}</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Emergency Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Contact Person Name"
                value={emergencyName}
                onChange={(e) => {
                  setEmergencyName(e.target.value);
                  setFormErrors(prev => ({ ...prev, emergencyName: null }));
                }}
                error={formErrors.emergencyName}
                required
                placeholder="John Doe (Spouse / Guardian)"
                />
              <FormField
                label="Contact Mobile Number"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => {
                  setEmergencyPhone(e.target.value);
                  setFormErrors(prev => ({ ...prev, emergencyPhone: null }));
                }}
                error={formErrors.emergencyPhone}
                required
                maxLength={10}
                placeholder="9876543211"
                helperText="10-digit mobile number"
              />
            </div>
          </div>

          {/* ABHA / ABDM Section */}
          <div className="border-t border-slate-200 pt-6 bg-slate-50 -mx-8 px-8 py-6">
            <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">ABHA (Ayushman Bharat Health Account) ID</h3>
            <p className="text-slate-500 text-xs mb-4">Link or create a national digital health card ID to allow clinical document sharing under ABDM.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">ABHA Card Number</label>
                <input
                  type="text"
                  value={abhaNumber}
                  onChange={(e) => setAbhaNumber(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500"
                  placeholder="14-digit number (e.g. 91-1234-5678-9012)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">ABHA Address (PHR Address)</label>
                <input
                  type="text"
                  value={abhaAddress}
                  onChange={(e) => setAbhaAddress(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500"
                  placeholder="username@abdm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="consent"
                checked={consentSigned}
                onChange={(e) => setConsentSigned(e.target.checked)}
                className="h-4.5 w-4.5 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="consent" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                Patient signs & provides consent to create/link their ABHA health card profile and share clinical reports.
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Processing...
                </>
              ) : 'Confirm Patient Registration'}
            </button>
          </div>
        </form>
      )}

      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-amber-50 flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-amber-900">Potential Duplicate Patient Detected</h3>
                <p className="text-amber-700 text-xs mt-1">
                  We found patient record(s) matching the mobile number or name and birth date combination.
                </p>
              </div>
            </div>
            
            <div className="p-6 max-h-60 overflow-y-auto space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matching Records:</p>
              {duplicatePatients.map((dup) => (
                <div key={dup.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{dup.first_name} {dup.last_name}</p>
                    <p className="text-slate-500 font-mono mt-0.5">MRN: {dup.mrn} | Phone: {dup.phone}</p>
                    <p className="text-slate-500 mt-0.5">DOB: {new Date(dup.dob).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateWarning(false);
                      navigate(`/reception/patients/${dup.id}`);
                    }}
                    className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded border border-teal-200 transition-all cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setIsSubmitting(false);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  handleRegister(undefined, true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md transition-all cursor-pointer"
              >
                Proceed as New Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Patients;

