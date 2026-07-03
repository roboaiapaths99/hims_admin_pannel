import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { Activity, Users, Calendar, CreditCard, Building, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { SkeletonCard } from '../components/Skeleton';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (user && user.role === 'patient') {
    return <Navigate to="/patient/portal" replace />;
  }

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/api/reports/dashboard-summary');
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching dashboard summary stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (!user) return null;

  // Helper to render role-based dashboard screens
  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );
    }

    switch (user.role) {
      case 'super_admin':
        return (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tenants</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats?.total_tenants ?? 0}</p>
                </div>
                <div className="h-12 w-12 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center">
                  <Building className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Branches</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats?.total_branches ?? 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center">
                  <Building className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff Admins</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats?.active_admins ?? 0}</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Quick links card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">SaaS Platform Controls</h3>
              <p className="text-slate-500 text-sm mb-6">Manage all tenant subdomains, branch offices, and configurations globally.</p>
              <Link
                to="/superadmin/tenants"
                className="inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all"
              >
                Open SaaS Console <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        );

      case 'hospital_admin':
      case 'branch_admin':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Patients</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.today_patients ?? 0}</p>
                </div>
                <div className="h-11 w-11 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appointments booked</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.appointments_booked ?? 0}</p>
                </div>
                <div className="h-11 w-11 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Queue Tokens</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.active_queue_tokens ?? 0}</p>
                </div>
                <div className="h-11 w-11 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Collections</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">₹ {stats?.today_collections?.toLocaleString('en-IN') ?? 0}</p>
                </div>
                <div className="h-11 w-11 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">Quick Shortcuts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/reception/patients/register" className="p-4 border border-slate-200 hover:border-teal-500 rounded-xl flex flex-col justify-center items-center text-center hover:bg-teal-50/20 transition-all shadow-sm">
                    <Users className="h-6 w-6 text-teal-600 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Register Patient</span>
                  </Link>
                  <Link to="/reception/appointments" className="p-4 border border-slate-200 hover:border-teal-500 rounded-xl flex flex-col justify-center items-center text-center hover:bg-teal-50/20 transition-all shadow-sm">
                    <Calendar className="h-6 w-6 text-teal-600 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Book OPD Slot</span>
                  </Link>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">Branch Status Summary</h3>
                <p className="text-sm text-slate-500 mb-4">Active Branch settings are controlled using the branch selection header dropdown.</p>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Active Doctors Registered</span>
                  <span className="text-sm font-bold text-slate-800">{stats?.active_doctors ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm font-medium text-slate-600">OT Bookings Today</span>
                  <span className="text-sm font-bold text-slate-800">{stats?.ot_rooms_occupied ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        // Default clinical staff view (Doctor, Nurse, Pharmacist, Lab, etc.)
        return (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex items-center space-x-6 transition-all duration-300 hover:scale-[1.005] hover:shadow-md">
              <div className="h-14 w-14 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Welcome back, {user.name}!</h2>
                <p className="text-slate-500 text-sm mt-1">Select your designated workspace links in the sidebar navigation panel to view patient queues and EMR worklists.</p>
              </div>
            </div>

            {/* Quick overview widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Your Profile Summary</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Designated Role</span>
                    <span className="text-sm font-bold text-slate-700 capitalize">{user.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Branch</span>
                    <span className="text-sm font-bold text-slate-700">{user.branch_id ? "Branch Office" : "Central Central Delhi Medical Centre"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Patient Security & Auditing Notice</h3>
                <p className="text-xs leading-relaxed text-slate-500">All EMR reads, clinical updates, and patient billing overrides are automatically signed and logged to the system audit trail. Protect your credentials.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Hospital Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back to the SaaS Hospital HMIS Platform console.</p>
      </div>

      {renderDashboardContent()}
    </div>
  );
};
export default Dashboard;
