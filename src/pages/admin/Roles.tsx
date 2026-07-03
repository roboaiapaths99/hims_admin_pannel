import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField } from '../../components/FormField';
import { Shield, Plus, Save, Trash2, Edit2, Loader2, Check, ShieldAlert } from 'lucide-react';

interface Role {
  id?: string;
  name: string;
  permissions: string[];
  tenant_id?: string;
  is_custom?: boolean;
}

const ALL_SYSTEM_PERMISSIONS = [
  { value: 'manage_branches', label: 'Manage Branches', category: 'Administrative' },
  { value: 'manage_staff', label: 'Manage Staff Directory', category: 'Administrative' },
  { value: 'manage_config', label: 'System Configuration', category: 'Administrative' },
  { value: 'manage_billing', label: 'Billing & Invoices', category: 'Financial' },
  { value: 'register_patient', label: 'Register Patient profiles', category: 'Front Desk' },
  { value: 'book_appointment', label: 'Book OPD Consultations', category: 'Front Desk' },
  { value: 'view_queue', label: 'Token Queue Worklists', category: 'Clinical' },
  { value: 'view_patient_emr', label: 'Read Patient Health Records (EMR)', category: 'Clinical' },
  { value: 'record_vitals', label: 'Nurse Triaging & Vitals', category: 'Clinical' },
  { value: 'write_consultation', label: 'Doctor Encounters & Prescriptions', category: 'Clinical' },
  { value: 'manage_labs', label: 'Laboratory Service Orders', category: 'Clinical' },
  { value: 'dispense_pharmacy', label: 'Pharmacy Dispensary Desk', category: 'Clinical' },
  { value: 'manage_ot', label: 'Surgical Schedules & OT Notes', category: 'Clinical' },
];

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form / Edit State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/org/roles');
      
      // Merge with default global roles to ensure built-ins are always visible for configuration overrides
      const defaultRoles: Role[] = [
        { name: 'hospital_admin', permissions: ['manage_branches', 'manage_staff', 'manage_config', 'view_queue', 'manage_billing'], is_custom: false },
        { name: 'branch_admin', permissions: ['manage_staff', 'manage_config', 'view_queue', 'manage_billing'], is_custom: false },
        { name: 'receptionist', permissions: ['register_patient', 'book_appointment', 'view_queue', 'manage_billing'], is_custom: false },
        { name: 'doctor', permissions: ['view_queue', 'write_consultation', 'view_patient_emr'], is_custom: false },
        { name: 'nurse', permissions: ['view_queue', 'record_vitals', 'view_patient_emr'], is_custom: false },
        { name: 'lab_technician', permissions: ['view_queue', 'manage_labs'], is_custom: false },
        { name: 'pharmacist', permissions: ['view_queue', 'dispense_pharmacy'], is_custom: false },
        { name: 'billing_staff', permissions: ['manage_billing', 'view_queue'], is_custom: false },
        { name: 'ot_coordinator', permissions: ['view_queue', 'manage_ot'], is_custom: false }
      ];

      const mergedRoles = [...res.data.map((r: any) => ({ ...r, is_custom: true }))];
      
      // Only append default roles if they haven't been customized/overridden in tenant database yet
      defaultRoles.forEach(def => {
        if (!mergedRoles.some(r => r.name === def.name)) {
          mergedRoles.push(def);
        } else {
          // If customized, mark as system role with overrides
          const matchIdx = mergedRoles.findIndex(r => r.name === def.name);
          mergedRoles[matchIdx].is_custom = false;
        }
      });

      setRoles(mergedRoles);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch role permissions matrix from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoleForEdit = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setIsEditingMode(true);
    setError(null);
    setSuccess(null);
  };

  const handleNewRoleClick = () => {
    setSelectedRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setIsEditingMode(true);
    setError(null);
    setSuccess(null);
  };

  const handlePermissionToggle = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    } else {
      setSelectedPermissions(prev => [...prev, permission]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Please provide a name for this role profile.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedRole && selectedRole.id) {
        // Update Custom Role / Override
        await apiClient.put(`/api/org/roles/${selectedRole.id}`, {
          name: roleName,
          permissions: selectedPermissions
        });
        setSuccess(`Permissions updated for role: ${roleName}`);
      } else if (selectedRole && !selectedRole.id) {
        // First-time database save of a built-in role to override its fallback permissions
        await apiClient.post('/api/org/roles', {
          name: roleName,
          permissions: selectedPermissions
        });
        setSuccess(`Custom permission overrides saved for: ${roleName}`);
      } else {
        // Create new custom role
        await apiClient.post('/api/org/roles', {
          name: roleName.toLowerCase().replace(/\s+/g, '_'),
          permissions: selectedPermissions
        });
        setSuccess(`Custom role profile '${roleName}' created successfully.`);
      }
      setIsEditingMode(false);
      setSelectedRole(null);
      await fetchRoles();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save role configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!role.id) return;
    if (!window.confirm(`Are you sure you want to permanently delete custom role '${role.name}'?`)) return;

    setIsLoading(true);
    try {
      await apiClient.delete(`/api/org/roles/${role.id}`);
      setSuccess(`Role '${role.name}' deleted.`);
      setIsEditingMode(false);
      setSelectedRole(null);
      await fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete role.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Shield className="h-7 w-7 text-teal-600 mr-2" /> Roles & Permissions Manager
          </h1>
          <p className="text-slate-500 text-sm">Define specialized user role groups and configure granular access control limits for modules.</p>
        </div>
        {!isEditingMode && (
          <button
            onClick={handleNewRoleClick}
            className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> Custom Role
          </button>
        )}
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess(null)} />}

      {isLoading ? (
        <div className="py-24 flex flex-col justify-center items-center">
          <Loader2 className="animate-spin h-10 w-10 text-teal-600 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Fetching access matrix...</p>
        </div>
      ) : isEditingMode ? (
        /* Edit / Create Form Screen */
        <form onSubmit={handleSaveRole} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {selectedRole ? `Configure Permissions: ${selectedRole.name.replace('_', ' ').toUpperCase()}` : 'Create Custom Access Profile'}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Toggle checkboxes to enable or restrict staff profiles from calling endpoints.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingMode(false)}
              className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
            >
              Cancel Edit
            </button>
          </div>

          <div className="max-w-md">
            <FormField
              label="Role profile name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              disabled={selectedRole !== null}
              placeholder="e.g. nurse_supervisor"
              required
            />
          </div>

          {/* Granular Checkboxes grouped by Category */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configure Module Scopes</h3>
            
            {['Administrative', 'Financial', 'Front Desk', 'Clinical'].map((cat) => {
              const items = ALL_SYSTEM_PERMISSIONS.filter(p => p.category === cat);
              return (
                <div key={cat} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">{cat} Powers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((perm) => {
                      const isActive = selectedPermissions.includes(perm.value);
                      return (
                        <label 
                          key={perm.value} 
                          className={`flex items-center space-x-3 p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isActive 
                              ? 'bg-white border-teal-500 ring-1 ring-teal-500 text-teal-900 font-bold' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                            checked={isActive}
                            onChange={() => handlePermissionToggle(perm.value)}
                          />
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditingMode(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center"
            >
              {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Access Rules
            </button>
          </div>
        </form>
      ) : (
        /* List Roles view */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div 
              key={role.name}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 capitalize tracking-wide flex items-center">
                    {role.name.replace('_', ' ')}
                  </h3>
                  <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded ${
                    role.is_custom 
                      ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {role.is_custom ? 'Custom Role' : 'System Built-In'}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSelectRoleForEdit(role)}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                    title="Configure permissions"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {role.id && role.is_custom && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="p-1.5 border border-slate-200 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete custom role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Permissions list bullets */}
              <div className="flex-1 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Scopes ({role.permissions.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map(p => (
                    <span 
                      key={p} 
                      className="text-[9px] bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono"
                    >
                      {p.replace('_', ' ')}
                    </span>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className="text-[10px] text-slate-400 italic">No access permissions configured yet.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Roles;
