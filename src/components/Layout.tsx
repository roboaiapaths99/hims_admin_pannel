import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../api/client';
import {
  Activity, Calendar, Users, Building, Stethoscope, 
  FlaskConical, Pill, CreditCard, LogOut, 
  LayoutDashboard, Settings, User, Bell, RefreshCw,
  Menu, X, Droplet, Shield, ChevronDown, ChevronRight,
  Sparkles, Search, Database, DollarSign, Bed, HeartHandshake,
  Wallet, History, MessageSquare, ClipboardList, BarChart3, Network,
  Truck, Utensils, Scan, BedDouble
} from 'lucide-react';
import { ToastContainer } from './Toast';
import { TourGuide } from './TourGuide';
import type { TourStep } from './TourGuide';

interface LayoutProps {
  children: React.ReactNode;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
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
  
  // 🔍 Sidebar Search State
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  // ✨ Interactive Tour Guide State & Context-Aware Steps Configuration
  const [isTourActive, setIsTourActive] = useState(false);
  
  const getTourSteps = (): TourStep[] => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return [
        {
          target: '[data-tour="dashboard-overview"]',
          title: 'Analytics Overview Dashboard',
          content: 'View real-time key metrics of OPD admissions, pharmacy billing summaries, and patient trends at a glance.',
          position: 'bottom'
        },
        {
          target: '[data-tour="sidebar-nav"]',
          title: 'Sidebar Navigation',
          content: 'Quickly access OPD/IPD registers, OT schedules, and other hospital clinical desks.',
          position: 'right'
        },
        {
          target: '[data-tour="branch-selector"]',
          title: 'Branch Scope Isolation',
          content: 'Toggle selected branch views to securely scope and filter metrics.',
          position: 'bottom'
        }
      ];
    }
    
    if (path.includes('/doctor/consultation/')) {
      return [
        {
          target: '[data-tour="consultation-vitals"]',
          title: 'Patient Clinical Vitals',
          content: 'Examine key vitals recordings, demographics, and clinical timeline history for this patient.',
          position: 'right'
        },
        {
          target: '[data-tour="consultation-notes"]',
          title: 'SOAP Consultation Notes',
          content: 'Record patient chief complaints, clinical examination findings, and plan treatment actions.',
          position: 'bottom'
        },
        {
          target: '[data-tour="consultation-icd10"]',
          title: 'ICD-10 Classifications',
          content: 'Search standard ICD-10 medical disease registries to log formal diagnoses.',
          position: 'left'
        },
        {
          target: '[data-tour="consultation-prescription"]',
          title: 'E-Prescription & Pharmacy Integration',
          content: 'Check live pharmacy inventories, select medications, and order prescriptions directly.',
          position: 'top'
        },
        {
          target: '[data-tour="consultation-ai-copilot"]',
          title: '✨ AI Clinical Copilot & Translator',
          content: 'Generate lay summaries of consults, simplify treatment instructions, and translate clinical guidance into local regional languages using Gemini AI.',
          position: 'left'
        }
      ];
    }
    
    if (path === '/admin/staff') {
      return [
        {
          target: '[data-tour="staff-list"]',
          title: 'Registered Staff Directory',
          content: 'View active profiles of clinical practitioners, billing clerks, reception desks, and pharmacists.',
          position: 'top'
        },
        {
          target: '[data-tour="staff-register-btn"]',
          title: 'Register Staff',
          content: 'Add new profiles, designate branch roles, and define user credentials.',
          position: 'left'
        },
        {
          target: '[data-tour="staff-device-lock"]',
          title: 'Device Lock Bindings',
          content: 'Manage active login constraints. Click "Release Device" to reset binding keys for support terminals.',
          position: 'left'
        }
      ];
    }
    
    if (path === '/admin/profile') {
      return [
        {
          target: '[data-tour="profile-editor"]',
          title: 'Branch Details Configurator',
          content: 'Manage branch registration names, phone lines, addresses, and tax numbers.',
          position: 'top'
        },
        {
          target: '[data-tour="profile-logo"]',
          title: 'Hospital Branding Logo',
          content: 'Upload branding logo images or input manual URIs for high-fidelity printed receipts.',
          position: 'left'
        },
        {
          target: '[data-tour="profile-preview"]',
          title: 'Real-Time letterhead Preview',
          content: 'Inspect how custom letterhead banners will render on printed tax invoices and prescriptions.',
          position: 'top'
        }
      ];
    }

    if (path === '/patient/portal') {
      return [
        {
          target: '[data-tour="portal-profile"]',
          title: 'Patient Medical Profile',
          content: 'Access your Medical Record Number (MRN), registered contact details, and clinical vitals history.',
          position: 'bottom'
        },
        {
          target: '[data-tour="portal-visits"]',
          title: 'Visits & Notes Timeline',
          content: 'Review past outpatient visits SOAP records, diagnostic prescriptions, and treatment plans.',
          position: 'top'
        },
        {
          target: '[data-tour="portal-diet"]',
          title: 'Patient Meal Ordering Screen',
          content: 'Admitted inpatients can directly request custom meals, specify dietary requirements, and track real-time kitchen preparation status.',
          position: 'top'
        }
      ];
    }

    if (path === '/billing/dashboard') {
      return [
        {
          target: '[data-tour="billing-queue"]',
          title: 'Inpatient & Outpatient Bills Queue',
          content: 'Examine patient records awaiting bill compiling, logging payments, or clearing advances.',
          position: 'top'
        },
        {
          target: '[data-tour="billing-compile"]',
          title: 'Dynamic Bill Compiler',
          content: 'Pre-fill consultation charges, diagnostic tests fees, bed rents, and dietary catering bills automatically.',
          position: 'left'
        }
      ];
    }

    if (path === '/kitchen/dashboard') {
      return [
        {
          target: '[data-tour="kitchen-pipeline"]',
          title: 'Preparation Pipeline Board',
          content: 'Track order volumes across preparation stages: Ordered, Preparing, Ready, and Delivered.',
          position: 'bottom'
        },
        {
          target: '[data-tour="kitchen-orders-list"]',
          title: 'Dietary Prescriptions Queue',
          content: 'Inspect order origins (Patient Order vs Clinical Prescriptions), room allocations, special cooking instructions, and advance delivery statuses.',
          position: 'top'
        }
      ];
    }

    if (path === '/admin/blood-bank') {
      return [
        {
          target: '[data-tour="blood-inventory"]',
          title: 'Blood Stock Inventory',
          content: 'Examine available stock counts categorized by group types (e.g. O-, AB+) and blood component types.',
          position: 'bottom'
        },
        {
          target: '[data-tour="blood-donors"]',
          title: 'Blood Donors Registry',
          content: 'Register donor details, record vitals screenings, and log blood bag collections.',
          position: 'top'
        },
        {
          target: '[data-tour="blood-requisitions"]',
          title: 'Recipient Requisitions Queue',
          content: 'Manage patient crossmatch requests, check compatibility, and register clinical transfusions.',
          position: 'top'
        }
      ];
    }
    
    // Default Layout Tour steps
    return [
      {
        target: '[data-tour="sidebar-nav"]',
        title: 'Workflow Navigation Console',
        content: 'Navigate through EMR consults, OPD appointment desks, OT schedules, IPD admissions, and ancillary services here.',
        position: 'right'
      },
      {
        target: '[data-tour="branch-selector"]',
        title: 'Branch Scope Isolation',
        content: 'Switch between hospital branches. Patient registry logs, billing books, and clinical sheets isolate safely under the active branch.',
        position: 'bottom'
      },
      {
        target: '[data-tour="notifications-bell"]',
        title: 'Live Notification Inbox',
        content: 'Track real-time queue admissions, invoice receipt clearances, and lab order updates instantly.',
        position: 'bottom'
      },
      {
        target: '[data-tour="user-profile"]',
        title: 'Account Profiles & Business Settings',
        content: 'Configure company business profiles, customize logo branding on invoices, manage security keys, or sign out.',
        position: 'left'
      },
      {
        target: '[data-tour="main-workspace"]',
        title: 'Active Working Desk',
        content: 'This main body handles your active workspace, patient files registries, OT logs, and billing forms.',
        position: 'top'
      }
    ];
  };

  useEffect(() => {
    const isCompleted = localStorage.getItem('hmis_tour_completed');
    if (!isCompleted && user) {
      const timer = setTimeout(() => setIsTourActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

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
            { path: '/admin/billing/subscription', label: 'SaaS Subscription', icon: Wallet, category: 'settings' }
          );
        }
        items.push(
          { path: '/admin/config/departments', label: 'Departments', icon: Network, category: 'settings' },
          { path: '/admin/config/dms', label: 'DMS Integration', icon: Database, category: 'settings' },
          { path: '/admin/config/roles', label: 'Role Permissions', icon: Shield, category: 'settings' },
          { path: '/admin/config/pricing', label: 'Billing Settings', icon: DollarSign, category: 'settings' },
          { path: '/admin/config/rooms', label: 'OT & Wards Setup', icon: Bed, category: 'settings' },
          { path: '/admin/config/tpa', label: 'TPA Providers Setup', icon: HeartHandshake, category: 'settings' },
          { path: '/admin/config/payments', label: 'Payment Gateways', icon: Wallet, category: 'settings' },
          { path: '/admin/referrals/doctors', label: 'Referring Doctors', icon: Users, category: 'settings' },
          { path: '/admin/referrals/ledger', label: 'Commission Ledger', icon: DollarSign, category: 'settings' },
          { path: '/admin/staff', label: 'Staff Directory', icon: Users, category: 'settings' },
          { path: '/admin/audit-logs', label: 'Audit Trail Logs', icon: History, category: 'settings' },
          { path: '/admin/feedback', label: 'Patient Feedback', icon: MessageSquare, category: 'settings' },
          { path: '/reports/dashboard', label: 'Reports & Analytics', icon: BarChart3, category: 'settings' }
        );
      }
      
      if (['receptionist', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/reception/patients', label: 'Patient Registry', icon: Users, category: 'billing' },
          { path: '/reception/appointments', label: 'OPD Schedule', icon: Calendar, category: 'billing' },
          { path: '/reception/queue', label: 'Token Queue Board', icon: ClipboardList, category: 'billing' },
          { path: '/billing/dashboard', label: 'Billing Desk', icon: CreditCard, category: 'billing' },
          { path: '/billing/claims', label: 'Insurance Claims', icon: Shield, category: 'billing' }
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
          { path: '/radiology/dashboard', label: 'Radiology Worklist', icon: Scan, category: 'ancillary' }
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
          { path: '/billing/claims', label: 'Insurance Claims', icon: Shield, category: 'billing' }
        );
      }
      
      if (['ot_coordinator', 'surgeon', 'anesthetist', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/ot/dashboard', label: 'OT Room Schedules', icon: Calendar, category: 'clinical' }
        );
      }

      if (['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/ipd/dashboard', label: 'In-Patient Dept (IPD)', icon: BedDouble, category: 'clinical' },
          { path: '/emergency/dashboard', label: 'Emergency (ER)', icon: Activity, category: 'clinical' },
          { path: '/emergency/ambulance', label: 'Ambulance Dispatch', icon: Truck, category: 'clinical' },
          { path: '/admin/blood-bank', label: 'Blood Bank', icon: Droplet, category: 'clinical' }
        );
      }

      if (['nurse', 'hospital_admin', 'branch_admin'].includes(user.role)) {
        items.push(
          { path: '/kitchen/dashboard', label: 'Kitchen & Diet Orders', icon: Utensils, category: 'clinical' }
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
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white text-slate-700 flex flex-col flex-shrink-0 z-40 transform lg:translate-x-0 lg:static lg:inset-auto transition-all duration-300 ease-in-out border-r border-slate-200 shadow-sm ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Title branding block */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center overflow-hidden">
            {selectedBranch?.logo_url ? (
              <img
                src={selectedBranch.logo_url.startsWith('/uploads') ? `${apiClient.defaults.baseURL || 'http://127.0.0.1:8002'}${selectedBranch.logo_url}` : selectedBranch.logo_url}
                className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 border border-slate-200 mr-2.5 flex-shrink-0"
                alt="Hospital Logo"
              />
            ) : (
              <div className="logo-pulse-ring h-8 w-8 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
            )}
            <span className="font-bold text-slate-800 tracking-wide text-xs truncate max-w-[140px] uppercase">
              {selectedBranch ? selectedBranch.name : 'Hospital HMIS'}
            </span>
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 🔍 Navigation Search Bar Widget */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search features..."
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium"
            />
            {sidebarSearchQuery && (
              <button 
                onClick={() => setSidebarSearchQuery('')} 
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav data-tour="sidebar-nav" className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Standing links (Overview/Dashboard) */}
          {navItems.filter(item => item.category === 'overview' && (!sidebarSearchQuery || item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`group flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-transparent ${
                  isActive
                    ? 'bg-teal-50/80 text-teal-800 border-l-4 border-teal-600 rounded-r-xl shadow-none'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.label}
              </Link>
            );
          })}

          {/* Grouped Workflow categories */}
          {categories.filter(cat => cat.id !== 'overview').map((cat) => {
            const catItems = navItems.filter(item => item.category === cat.id && (!sidebarSearchQuery || item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase())));
            if (catItems.length === 0) return null;
            
            const isCollapsed = !sidebarSearchQuery && collapsedSections[cat.id];
            
            return (
              <div key={cat.id} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleSection(cat.id)}
                  disabled={!!sidebarSearchQuery}
                  className="w-full flex items-center justify-between px-4 py-1 text-[10px] font-black uppercase tracking-wider text-teal-700 hover:text-teal-800 transition-colors bg-transparent border-none cursor-pointer text-left focus:outline-none disabled:cursor-default"
                >
                  <span>{cat.label}</span>
                  {!sidebarSearchQuery && (
                    isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    )
                  )}
                </button>

                {/* Section links */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pl-1.5">
                    {catItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`group flex items-center px-3.5 py-2 rounded-r-xl text-[11px] font-bold transition-all border-l-4 ${
                            isActive
                              ? 'bg-teal-50/70 text-teal-800 border-teal-600'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mr-2.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Search Result fallback empty notice */}
          {sidebarSearchQuery && categories.every(cat => navItems.filter(item => item.category === cat.id && item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase())).length === 0) && (
            <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
              No matching pages found
            </div>
          )}
        </nav>

        {/* Logout session button block */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 rounded-lg text-xs font-extrabold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-transparent bg-transparent"
          >
            <LogOut className="h-4.5 w-4.5 mr-3 text-red-500 flex-shrink-0" />
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
              <div data-tour="branch-selector" className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-all hover:bg-slate-100/80">
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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">{user?.role.replace('_', ' ')}</p>
            </div>
            
            {/* Interactive Tour Guide Spark */}
            <button
              onClick={() => setIsTourActive(true)}
              className="h-10 w-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-teal-600 hover:text-teal-700 cursor-pointer transition-all relative shadow-sm"
              title="Start Interactive Tour Guide"
            >
              <Sparkles className="h-4.5 w-4.5 animate-pulse text-teal-600" />
            </button>

            {/* Notification Bell Dropdown */}
            {user && user.role !== 'super_admin' && (
              <div className="relative mr-1">
                <button
                  data-tour="notifications-bell"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                  }}
                  className="h-10 w-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer transition-all relative shadow-sm"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[9px] font-bold px-1.5 py-0.5 border-2 border-white">
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
                data-tour="user-profile"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="h-10 w-10 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-full flex items-center justify-center text-teal-700 font-semibold cursor-pointer transition-all shadow-sm"
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
        <main data-tour="main-workspace" className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
      <ToastContainer />
      <TourGuide steps={getTourSteps()} isActive={isTourActive} onClose={() => setIsTourActive(false)} />
    </div>
  );
};
export default Layout;
