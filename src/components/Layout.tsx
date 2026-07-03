import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../api/client';
import {
  Activity, Calendar, Users, Building, Stethoscope, 
  FlaskConical, Pill, CreditCard, LogOut, 
  LayoutDashboard, Settings, User, Bell, RefreshCw,
  Menu, X, Droplet, Shield, ChevronDown, ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, currentBranchId, setCurrentBranchId, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // If logged in, fetch list of branches for selection
    if (user && user.role !== 'super_admin') {
      apiClient.get('/api/org/branches')
        .then((res) => {
          setBranches(res.data);
          // Auto-select first branch if none selected
          if (!currentBranchId && res.data.length > 0) {
            setCurrentBranchId(res.data[0].id);
          }
        })
        .catch((err) => console.error('Failed to load branches:', err));
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      fetchNotifications();
      fetchUnreadCount();

      // Poll notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, currentBranchId]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/api/notifications/user');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get('/api/notifications/count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/api/notifications/mark-read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Define sidebar navigation items based on user role permissions
  const getNavItems = () => {
    if (!user) return [];
    
    const items = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'overview' }
    ];

    if (user.role === 'super_admin') {
      items.push(
        { path: '/superadmin/tenants', label: 'Tenants Management', icon: Building, category: 'saas' },
        { path: '/superadmin/branches', label: 'Branches Registry', icon: Building, category: 'saas' },
        { path: '/superadmin/users', label: 'Global Staff Admin', icon: Users, category: 'saas' }
      );
    } else {
      // Central Configurations
      if (['hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/admin/profile', label: 'Hospital Profile', icon: Building, category: 'settings' }
        );
        if (user.role === 'hospital_admin') {
          items.push(
            { path: '/admin/billing/subscription', label: 'SaaS Subscription', icon: CreditCard, category: 'settings' }
          );
        }
        items.push(
          { path: '/admin/config/departments', label: 'Departments', icon: Building, category: 'settings' },
          { path: '/admin/config/dms', label: 'DMS Integration', icon: Settings, category: 'settings' },
          { path: '/admin/config/roles', label: 'Role Permissions', icon: Shield, category: 'settings' },
          { path: '/admin/config/pricing', label: 'Billing Settings', icon: Settings, category: 'settings' },
          { path: '/admin/config/rooms', label: 'OT & Wards Setup', icon: Settings, category: 'settings' },
          { path: '/admin/config/tpa', label: 'TPA Providers Setup', icon: Settings, category: 'settings' },
          { path: '/admin/config/payments', label: 'Payment Gateways', icon: Settings, category: 'settings' },
          { path: '/admin/referrals/doctors', label: 'Referring Doctors', icon: Users, category: 'settings' },
          { path: '/admin/referrals/ledger', label: 'Commission Ledger', icon: CreditCard, category: 'settings' },
          { path: '/admin/staff', label: 'Staff Directory', icon: Users, category: 'settings' },
          { path: '/admin/audit-logs', label: 'Audit Trail Logs', icon: Settings, category: 'settings' },
          { path: '/admin/feedback', label: 'Patient Feedback', icon: Activity, category: 'settings' },
          { path: '/reports/dashboard', label: 'Reports & Analytics', icon: Activity, category: 'settings' }
        );
      }
      
      if (['receptionist', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/reception/patients', label: 'Patient Registry', icon: Users, category: 'billing' },
          { path: '/reception/appointments', label: 'OPD Schedule', icon: Calendar, category: 'billing' },
          { path: '/reception/queue', label: 'Token Queue Board', icon: Activity, category: 'billing' },
          { path: '/billing/dashboard', label: 'Billing Desk', icon: CreditCard, category: 'billing' },
          { path: '/billing/claims', label: 'Insurance Claims', icon: CreditCard, category: 'billing' }
        );
      }

      if (['nurse'].includes(user.role)) {
        items.push(
          { path: '/nurse/dashboard', label: 'Nurse Vitals Worklist', icon: Activity, category: 'clinical' }
        );
      }

      if (['doctor', 'surgeon', 'anesthetist'].includes(user.role)) {
        items.push(
          { path: '/doctor/dashboard', label: 'EMR Consult Queue', icon: Stethoscope, category: 'clinical' }
        );
      }

      if (['lab_technician', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/lab/dashboard', label: 'Lab Orders Registry', icon: FlaskConical, category: 'ancillary' }
        );
      }

      if (['radiologist', 'lab_technician', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/radiology/dashboard', label: 'Radiology Worklist', icon: FlaskConical, category: 'ancillary' }
        );
      }

      if (['pharmacist', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/pharmacy/dashboard', label: 'Pharmacy Dispenser', icon: Pill, category: 'ancillary' }
        );
      }
      
      if (['billing_staff'].includes(user.role)) {
        items.push(
          { path: '/billing/dashboard', label: 'Billing Desk', icon: CreditCard, category: 'billing' },
          { path: '/billing/claims', label: 'Insurance Claims', icon: CreditCard, category: 'billing' }
        );
      }
      
      if (['ot_coordinator', 'surgeon', 'anesthetist', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/ot/dashboard', label: 'OT Room Schedules', icon: Calendar, category: 'clinical' }
        );
      }

      if (['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/ipd/dashboard', label: 'In-Patient Dept (IPD)', icon: Building, category: 'clinical' },
          { path: '/emergency/dashboard', label: 'Emergency (ER)', icon: Activity, category: 'clinical' },
          { path: '/emergency/ambulance', label: 'Ambulance Dispatch', icon: Activity, category: 'clinical' },
          { path: '/admin/blood-bank', label: 'Blood Bank', icon: Droplet, category: 'clinical' }
        );
      }

      if (['nurse', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/kitchen/dashboard', label: 'Kitchen & Diet Orders', icon: Activity, category: 'clinical' }
        );
      }

      if (['patient'].includes(user.role)) {
        items.push(
          { path: '/patient/portal', label: 'Patient Portal', icon: User, category: 'clinical' }
        );
      }
    }
    
    return items;
  };

  const navItems = getNavItems();
  const selectedBranch = branches.find(b => b.id === currentBranchId);

  const categories = [
    { id: 'overview', label: '' },
    { id: 'saas', label: 'Platform Console' },
    { id: 'clinical', label: 'Clinical Care' },
    { id: 'ancillary', label: 'Ancillary Services' },
    { id: 'billing', label: 'Billing & Front Desk' },
    { id: 'settings', label: 'Hospital Settings' },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Layout */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-40 transform lg:translate-x-0 lg:static lg:inset-auto transition-transform duration-300 ease-in-out ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Title branding block */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-teal-500 mr-3" />
            <span className="font-bold text-white tracking-wide text-lg">Hospital HMIS</span>
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {/* Standing links (Overview/Dashboard) */}
          {navItems.filter(item => item.category === 'overview').map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 mr-3 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Grouped Workflow categories */}
          {categories.filter(cat => cat.id !== 'overview').map((cat) => {
            const catItems = navItems.filter(item => item.category === cat.id);
            if (catItems.length === 0) return null;
            
            const isCollapsed = collapsedSections[cat.id];
            
            return (
              <div key={cat.id} className="space-y-1.5">
                {/* Category Header */}
                <button
                  onClick={() => toggleSection(cat.id)}
                  className="w-full flex items-center justify-between px-4 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer text-left focus:outline-none"
                >
                  <span>{cat.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {/* Section links */}
                {!isCollapsed && (
                  <div className="space-y-1 pl-1">
                    {catItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-teal-600/90 text-white shadow-md shadow-teal-600/10'
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout session button block */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium hover:bg-red-950/30 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
          >
            <LogOut className="h-5 w-5 mr-3 text-red-500 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Workspace layout container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar layout */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg lg:text-xl font-semibold text-slate-800 truncate">
              {location.pathname === '/dashboard' ? 'Overview Dashboard' : ''}
            </h1>
            
            {/* Dynamic Branch selector (Scoped access only) */}
            {user && user.role !== 'super_admin' && branches.length > 0 && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch:</span>
                <select
                  value={currentBranchId || ''}
                  onChange={(e) => setCurrentBranchId(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none border-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Profile details drawer container */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{user?.name}</p>
              <p className="text-xs font-medium text-slate-500 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
            
            {/* Notification Bell Dropdown */}
            {user && user.role !== 'super_admin' && (
              <div className="relative mr-2">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                  }}
                  className="h-10 w-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer transition-all relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[9px] font-bold px-1.5 py-0.5 border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center font-bold">
                      <span className="text-slate-700 text-sm">Notifications</span>
                      <div className="flex space-x-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] text-teal-600 hover:text-teal-800 font-bold bg-transparent border-0 cursor-pointer"
                          >
                            Mark All Read
                          </button>
                        )}
                        <button 
                          onClick={() => { fetchNotifications(); fetchUnreadCount(); }}
                          className="text-[10px] text-slate-600 hover:text-slate-800 font-bold flex items-center bg-transparent border-0 cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 font-medium">
                          No recent notifications.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 hover:bg-slate-50 transition-all text-left ${!n.is_read ? 'bg-teal-50/20' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${
                                n.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                n.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                n.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {n.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 font-sans">
                              {n.title}
                            </p>
                            <p className="text-[10px] text-slate-600 font-sans mt-0.5 whitespace-pre-wrap">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button 
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="h-10 w-10 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-full flex items-center justify-center text-teal-700 font-semibold cursor-pointer transition-all"
              >
                <User className="h-5 w-5" />
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content body mount container */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
export default Layout;
