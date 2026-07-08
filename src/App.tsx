import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';
import Dashboard from './pages/Dashboard';
import Departments from './pages/admin/Departments';
import Pricing from './pages/admin/Pricing';
import Rooms from './pages/admin/Rooms';
import Staff from './pages/admin/Staff';
import ReportsDashboard from './pages/admin/ReportsDashboard';
import AuditLogs from './pages/admin/AuditLogs';
import Unauthorized from './pages/Unauthorized';
import HospitalProfile from './pages/admin/HospitalProfile';
import SaaSBilling from './pages/admin/SaaSBilling';
import Roles from './pages/admin/Roles';
import { DMSIntegration } from './pages/admin/DMSIntegration';
import Patients from './pages/reception/Patients';
import PatientDetails from './pages/reception/PatientDetails';
import Appointments from './pages/reception/Appointments';
import Queue from './pages/reception/Queue';
import NurseDashboard from './pages/nurse/Dashboard';
import DoctorDashboard from './pages/doctor/Dashboard';
import Consultation from './pages/doctor/Consultation';
import DoctorTeleconsultation from './pages/doctor/DoctorTeleconsultation';
import PatientTeleconsultation from './pages/patient/PatientTeleconsultation';
import { PatientPortal } from './pages/patient/PatientPortal';
import LabDashboard from './pages/lab/Dashboard';
import EnterResults from './pages/lab/EnterResults';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import PharmacyDispense from './pages/pharmacy/Dispense';
import BillingDashboard from './pages/billing/Dashboard';
import NewInvoice from './pages/billing/NewInvoice';
import ViewInvoice from './pages/billing/ViewInvoice';
import Checkout from './pages/billing/Checkout';
import PaymentSuccess from './pages/billing/PaymentSuccess';
import PaymentFailure from './pages/billing/PaymentFailure';
import TPASettings from './pages/billing/TPASettings';
import ClaimsDashboard from './pages/billing/ClaimsDashboard';
import PatientPolicy from './pages/billing/PatientPolicy';
import OTDashboard from './pages/ot/OTDashboard';
import BookSurgery from './pages/ot/BookSurgery';
import SurgicalChecklist from './pages/ot/SurgicalChecklist';
import SurgeryNotes from './pages/ot/SurgeryNotes';
import IPDDashboard from './pages/ipd/IPDDashboard';
import AdmitPatient from './pages/ipd/AdmitPatient';
import IPDWorkspace from './pages/ipd/IPDWorkspace';
import DischargePatient from './pages/ipd/DischargePatient';
import RadiologyDashboard from './pages/radiology/RadiologyDashboard';
import RadiologyEnterResults from './pages/radiology/EnterResults';
import ReferralDoctors from './pages/admin/ReferralDoctors';
import ReferralLedger from './pages/admin/ReferralLedger';
import EmergencyDashboard from './pages/emergency/EmergencyDashboard';
import AmbulanceDispatch from './pages/emergency/AmbulanceDispatch';
import KitchenDashboard from './pages/kitchen/KitchenDashboard';
import FeedbackDashboard from './pages/admin/FeedbackDashboard';
import PaymentSettings from './pages/admin/PaymentSettings';
import { BloodBankDashboard } from './pages/admin/BloodBankDashboard';
import { RegisterHospital } from './pages/RegisterHospital';
import SaaSPaymentResult from './pages/admin/SaaSPaymentResult';
import DriverDashboard from './pages/driver/DriverDashboard';
import { RegisterPatient } from './pages/patient/RegisterPatient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Public Registration Route */}
          <Route path="/register" element={<RegisterHospital />} />
          <Route path="/patient/register" element={<RegisterPatient />} />

          {/* Unauthorized Page Route */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Main Layout routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/superadmin/tenants"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Layout>
                  <SuperAdmin />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/superadmin/branches"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Layout>
                  <SuperAdmin />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/superadmin/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Layout>
                  <SuperAdmin />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Scoped Configuration Routes */}
          <Route
            path="/admin/config/dms"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <DMSIntegration />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/departments"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <Departments />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/pricing"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <Pricing />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/roles"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <Roles />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/rooms"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <Rooms />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/payments"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <PaymentSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <Staff />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/billing/subscription"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <Layout>
                  <SaaSBilling />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <HospitalProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <AuditLogs />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <ReportsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reception/patients"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <Patients />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reception/patients/:id"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PatientDetails />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reception/appointments"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <Appointments />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reception/queue"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <Queue />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/nurse/dashboard"
            element={
              <ProtectedRoute allowedRoles={['nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <NurseDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'surgeon', 'anesthetist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <DoctorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/consultation/:id"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'surgeon', 'anesthetist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <Consultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/teleconsultation/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'surgeon', 'anesthetist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <DoctorTeleconsultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/teleconsultation/:sessionId"
            element={<PatientTeleconsultation />}
          />

          <Route
            path="/lab/dashboard"
            element={
              <ProtectedRoute allowedRoles={['lab_technician', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <LabDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lab/results/enter/:orderId"
            element={
              <ProtectedRoute allowedRoles={['lab_technician', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <EnterResults />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pharmacy/dashboard"
            element={
              <ProtectedRoute allowedRoles={['pharmacist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PharmacyDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pharmacy/dispense/:id"
            element={
              <ProtectedRoute allowedRoles={['pharmacist', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PharmacyDispense />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing/dashboard"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'billing_staff', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <BillingDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing/invoice/new"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'billing_staff', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <NewInvoice />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing/invoice/view/:id"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'billing_staff', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <ViewInvoice />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/config/tpa"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <TPASettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing/claims"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'billing_staff', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <ClaimsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing/patient-policy/:id"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'billing_staff', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PatientPolicy />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ot/dashboard"
            element={
              <ProtectedRoute allowedRoles={['surgeon', 'anesthetist', 'ot_coordinator', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <OTDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ot/booking/new"
            element={
              <ProtectedRoute allowedRoles={['surgeon', 'anesthetist', 'ot_coordinator', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <BookSurgery />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ot/checklist/:id"
            element={
              <ProtectedRoute allowedRoles={['surgeon', 'anesthetist', 'ot_coordinator', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <SurgicalChecklist />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ot/notes/:id"
            element={
              <ProtectedRoute allowedRoles={['surgeon', 'anesthetist', 'ot_coordinator', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <SurgeryNotes />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* IPD Routes */}
          <Route
            path="/ipd/dashboard"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <IPDDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ipd/admit"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <AdmitPatient />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ipd/workspace/:admissionId"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <IPDWorkspace />
                </Layout>
              </ProtectedRoute>
            }
          />

           <Route
            path="/ipd/discharge/:admissionId"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'anesthetist', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <DischargePatient />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Radiology Routes */}
          <Route
            path="/radiology/dashboard"
            element={
              <ProtectedRoute allowedRoles={['radiologist', 'lab_technician', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <RadiologyDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/radiology/results/enter/:orderId"
            element={
              <ProtectedRoute allowedRoles={['radiologist', 'lab_technician', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <RadiologyEnterResults />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Referral & Commission Routes */}
          <Route
            path="/admin/referrals/doctors"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <ReferralDoctors />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/referrals/ledger"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <ReferralLedger />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/payment/checkout/:id" element={<Checkout />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />
          <Route path="/saas/payment/success" element={<SaaSPaymentResult />} />
          <Route path="/saas/payment/failure" element={<SaaSPaymentResult />} />

          {/* Emergency Routes */}
          <Route
            path="/emergency/dashboard"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <EmergencyDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/emergency/ambulance"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'surgeon', 'nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <AmbulanceDispatch />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute allowedRoles={['driver', 'ambulance_driver', 'hospital_admin', 'branch_admin']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />



          {/* Kitchen Service Route */}
          <Route
            path="/kitchen/dashboard"
            element={
              <ProtectedRoute allowedRoles={['nurse', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <KitchenDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Patient Feedback Route */}
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'branch_admin']}>
                <Layout>
                  <FeedbackDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Blood Bank Route */}
          <Route
            path="/admin/blood-bank"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <BloodBankDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Patient Portal & Teleconsultation Routes */}
          <Route
            path="/patient/portal"
            element={
              <ProtectedRoute allowedRoles={['patient', 'receptionist', 'doctor', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PatientPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/teleconsultation"
            element={
              <ProtectedRoute allowedRoles={['patient', 'receptionist', 'doctor', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <PatientTeleconsultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/teleconsultation"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'surgeon', 'hospital_admin', 'branch_admin']}>
                <Layout>
                  <DoctorTeleconsultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback Redirections */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
