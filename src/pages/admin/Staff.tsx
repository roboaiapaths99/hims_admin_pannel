import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField, SelectField } from '../../components/FormField';
import { getEmailError, validatePassword } from '../../utils/validation';
import { Users, Plus, AlertCircle, Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  device_id?: string | null;
  created_at: string;
  last_login?: string;
  login_count?: number;
  last_active?: string;
}

export const Staff: React.FC = () => {
  const { user } = useAuthStore();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({
    name: null,
    email: null,
    password: null
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/org/users');
      setStaffList(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load staff list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseDevice = async (userId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to release the device lock binding for ${staffName}?`)) {
      return;
    }
    setError(null);
    try {
      await apiClient.post(`/api/org/users/${userId}/release-device`);
      await fetchStaff();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to release device lock.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string | null> = {
      name: !name.trim() ? 'Staff name is required' : null,
      email: getEmailError(email),
      password: validatePassword(password)
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
    try {
      const branchId = localStorage.getItem('hmis_current_branch_id');
      const tenantId = user?.tenant_id;
      
      await apiClient.post('/api/org/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        is_active: true,
        tenant_id: tenantId,
        branch_id: branchId
      });
      
      setName('');
      setEmail('');
      setPassword('');
      setRole('doctor');
      setFormErrors({});
      setShowModal(false);
      await fetchStaff();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Staff Directory</h1>
          <p className="text-slate-500 text-sm">Manage hospital clinical practitioners, nurses, billing clerks, and pharmacists.</p>
        </div>
        <button
          data-tour="staff-register-btn"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Register Staff
        </button>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Staff Directory Table Grid */}
      <div data-tour="staff-list" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
            <Users className="h-5 w-5 text-teal-600 mr-2" /> Registered Clinical & Support Staff
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
            {staffList.length} Active Profiles
          </span>
        </div>
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role Profile</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Logins / Activity</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Device Lock</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                    No staff members registered for this branch.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{staff.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{staff.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize font-semibold">
                      {staff.role.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div>Logins: <strong className="text-slate-800">{staff.login_count || 0}</strong></div>
                      {staff.last_active ? (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Active: {new Date(staff.last_active).toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">Never active</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        staff.is_active ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {staff.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {staff.device_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          Unbound
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {staff.device_id ? (
                        <button
                          data-tour="staff-device-lock"
                          onClick={() => handleReleaseDevice(staff.id, staff.name)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-amber-300 text-xs font-bold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-all"
                        >
                          Release Device
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold italic">No device bound</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Register Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Register Staff Member</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <FormField
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormErrors(prev => ({ ...prev, name: null }));
                }}
                error={formErrors.name}
                required
                placeholder="Dr. Sarah Connor"
              />
              <FormField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors(prev => ({ ...prev, email: null }));
                }}
                error={formErrors.email}
                required
                placeholder="sarahconnor@hospital.com"
              />
              <FormField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormErrors(prev => ({ ...prev, password: null }));
                }}
                error={formErrors.password}
                required
                placeholder="••••••••"
                helperText="At least 8 characters with uppercase, lowercase, and number"
              />
              <SelectField
                label="Designated Role Profile"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: 'doctor', label: 'OPD Physician / Doctor' },
                  { value: 'surgeon', label: 'Surgeon' },
                  { value: 'anesthetist', label: 'Anesthetist' },
                  { value: 'nurse', label: 'Nurse Practitioner' },
                  { value: 'pharmacist', label: 'Pharmacist' },
                  { value: 'lab_technician', label: 'Lab Technician' },
                  { value: 'billing_staff', label: 'Billing Staff' },
                  { value: 'ot_coordinator', label: 'OT Coordinator' },
                  { value: 'receptionist', label: 'Front Desk / Receptionist' },
                  { value: 'driver', label: 'Ambulance Driver' }
                ]}
              />
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Staff;
