import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { 
  Building, Plus, ShieldAlert, CheckCircle, XCircle, 
  Users, AlertCircle, Loader2, CreditCard, Settings, Calendar,
  Activity, Shield
} from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  contact_email: string;
  status: string;
  plan_id?: string;
  subscription_status?: string;
  subscription_end?: string | null;
  max_branches?: number;
  max_staff?: number;
  max_patients?: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  contact_number: string;
  tenant_id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: string | null;
  branch_id: string | null;
  created_at: string;
}

export const SuperAdmin: React.FC = () => {
  const location = useLocation();
  
  // Resolve active tab from URL path
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[pathParts.length - 1] || 'tenants';

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms states
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchContact, setBranchContact] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('hospital_admin');
  const [userTenantId, setUserTenantId] = useState('');
  const [userBranchId, setUserBranchId] = useState('');

  // Subscription override modal states
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [subPlanId, setSubPlanId] = useState('free_trial');
  const [subStatus, setSubStatus] = useState('trialing');
  const [subEndDate, setSubEndDate] = useState('');
  const [subMaxBranches, setSubMaxBranches] = useState(1);
  const [subMaxStaff, setSubMaxStaff] = useState(5);
  const [subMaxPatients, setSubMaxPatients] = useState(100);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantsRes, branchesRes, usersRes] = await Promise.all([
        apiClient.get('/api/org/tenants'),
        apiClient.get('/api/org/branches'),
        apiClient.get('/api/org/users')
      ]);
      setTenants(tenantsRes.data);
      setBranches(branchesRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load SaaS console data. Verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/org/tenants', {
        name: tenantName,
        subdomain: tenantSubdomain.toLowerCase(),
        contact_email: tenantEmail,
        status: 'active'
      });
      setShowTenantModal(false);
      setTenantName('');
      setTenantSubdomain('');
      setTenantEmail('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/org/branches', {
        name: branchName,
        code: branchCode.toUpperCase(),
        address: branchAddress,
        contact_number: branchContact,
        tenant_id: selectedTenantId
      });
      setShowBranchModal(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchContact('');
      setSelectedTenantId('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create branch.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/org/users', {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        tenant_id: userTenantId || null,
        branch_id: userBranchId || null
      });
      setShowUserModal(false);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('hospital_admin');
      setUserTenantId('');
      setUserBranchId('');
      alert('User account created successfully!');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create staff user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSubModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSubPlanId(tenant.plan_id || 'free_trial');
    setSubStatus(tenant.subscription_status || 'trialing');
    
    if (tenant.subscription_end) {
      const date = new Date(tenant.subscription_end);
      setSubEndDate(date.toISOString().split('T')[0]);
    } else {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setSubEndDate(date.toISOString().split('T')[0]);
    }
    
    setSubMaxBranches(tenant.max_branches || 1);
    setSubMaxStaff(tenant.max_staff || 5);
    setSubMaxPatients(tenant.max_patients || 100);
    setShowSubModal(true);
  };

  const handleOverrideSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post(`/api/saas/super-admin/tenants/${selectedTenant.id}/subscription`, {
        plan_id: subPlanId,
        subscription_status: subStatus,
        subscription_end: new Date(subEndDate).toISOString(),
        max_branches: subMaxBranches,
        max_staff: subMaxStaff,
        max_patients: subMaxPatients
      });
      setShowSubModal(false);
      await fetchData();
      alert("Tenant subscription successfully overridden!");
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to override tenant subscription settings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SaaS Platform Console</h1>
          <p className="text-slate-500 text-sm">Super Admin management controls for tenants, hospital branches, and system administrators.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowTenantModal(true)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> New Tenant
          </button>
          <button
            onClick={() => setShowBranchModal(true)}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> New Branch
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-all"
          >
            <Users className="h-4 w-4 mr-2" /> Register Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            to="/superadmin/tenants"
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'tenants' 
                ? 'border-teal-600 text-teal-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Hospital Tenants
          </Link>
          <Link
            to="/superadmin/branches"
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'branches' 
                ? 'border-teal-600 text-teal-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Branches Registry
          </Link>
          <Link
            to="/superadmin/users"
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'users' 
                ? 'border-teal-600 text-teal-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Global Staff Accounts
          </Link>
        </nav>
      </div>

      {/* Conditional View Rendering */}
      {activeTab === 'tenants' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <Building className="h-5 w-5 text-teal-600 mr-2" /> Registered Hospital Tenants
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {tenants.length} Active
            </span>
          </div>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subdomain</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SaaS Tier / Limits</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No hospital tenants configured. Click "New Tenant" to initialize the platform.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{t.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{t.subdomain}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        <div>Tier: <strong className="text-slate-800 uppercase">{t.plan_id || 'free_trial'}</strong></div>
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          B: {t.max_branches || 1} | S: {t.max_staff || 5} | P: {t.max_patients || 100}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {t.subscription_end ? (
                          new Date(t.subscription_end) < new Date() ? (
                            <span className="text-red-600 font-bold">Expired</span>
                          ) : (
                            <span>Exp: {new Date(t.subscription_end).toLocaleDateString()}</span>
                          )
                        ) : (
                          <span className="text-teal-600 font-bold">Lifetime</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          t.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {t.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <button
                          onClick={() => handleOpenSubModal(t)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-bold cursor-pointer transition-all"
                        >
                          <Settings className="h-3.5 w-3.5 mr-1 text-slate-500" /> Override SaaS
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <Building className="h-5 w-5 text-teal-600 mr-2" /> Registered Hospital Branches
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {branches.length} Registered
            </span>
          </div>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={4} />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Associated Tenant ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No branches configured.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{b.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{b.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                        {tenants.find(t => t.id === b.tenant_id)?.name || b.tenant_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div>{b.contact_number}</div>
                        <div className="mt-0.5 text-slate-400">{b.address}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <Users className="h-5 w-5 text-teal-600 mr-2" /> Global User Registries
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {users.length} Active Users
            </span>
          </div>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={5} />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Scope</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No registered staff accounts.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-bold uppercase">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-semibold">
                        {tenants.find(t => t.id === u.tenant_id)?.name || 'Platform (Global)'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {branches.find(b => b.id === u.branch_id)?.name || 'All Branches'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SaaS Subscription Override Modal */}
      {showSubModal && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Override SaaS: {selectedTenant.name}</h3>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleOverrideSubscription} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Plan Tier</label>
                <select
                  value={subPlanId}
                  onChange={(e) => setSubPlanId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="free_trial">Free Trial</option>
                  <option value="basic_plan">Basic Plan</option>
                  <option value="standard_plan">Standard Plan</option>
                  <option value="premium_plan">Premium Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Subscription Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Subscription End Date</label>
                <input
                  type="date"
                  required
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Max Branches</label>
                  <input
                    type="number"
                    value={subMaxBranches}
                    onChange={(e) => setSubMaxBranches(parseInt(e.target.value))}
                    className="mt-1 block w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Max Staff</label>
                  <input
                    type="number"
                    value={subMaxStaff}
                    onChange={(e) => setSubMaxStaff(parseInt(e.target.value))}
                    className="mt-1 block w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Max Patients</label>
                  <input
                    type="number"
                    value={subMaxPatients}
                    onChange={(e) => setSubMaxPatients(parseInt(e.target.value))}
                    className="mt-1 block w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Tenant Modal */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Add Hospital Tenant</h3>
              <button onClick={() => setShowTenantModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Hospital Chain Name</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Medicare Super Speciality"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Subdomain Prefix</label>
                <input
                  type="text"
                  required
                  value={tenantSubdomain}
                  onChange={(e) => setTenantSubdomain(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="medicare"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Email</label>
                <input
                  type="email"
                  required
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="admin@medicare.com"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer"
                >
                  Save Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Configure Hospital Branch</h3>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Select Hospital Tenant</label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Branch City/Name</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Delhi Branch"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Branch Code (Prefix)</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="DEL"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Branch Address</label>
                <input
                  type="text"
                  required
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="12 Block G, Connaught Place, New Delhi"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Number</label>
                <input
                  type="text"
                  required
                  value={branchContact}
                  onChange={(e) => setBranchContact(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="+91-11-23456789"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Register Staff Administrator</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Target Hospital Tenant</label>
                <select
                  required
                  value={userTenantId}
                  onChange={(e) => setUserTenantId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Target Branch (Optional)</label>
                <select
                  value={userBranchId}
                  onChange={(e) => setUserBranchId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Branch (Global to Tenant)...</option>
                  {branches.filter(b => b.tenant_id === userTenantId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="johndoe@medicare.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Role Profile</label>
                <select
                  required
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="hospital_admin">Hospital Admin (Multi-Branch)</option>
                  <option value="branch_admin">Branch Admin (Single Branch)</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="billing_staff">Billing Staff</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
