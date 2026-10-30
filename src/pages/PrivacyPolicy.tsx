import React from 'react';
import { Shield, Lock, FileText, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-800/80 border border-slate-700/60 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700/60">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-400" />
            <span className="font-extrabold text-lg tracking-tight text-white">Technula HIMS</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            HIPAA & DPDP Act Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy & Data Security
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Effective Date: January 1, 2026 · Last Updated: October 30, 2026
          </p>
        </div>

        {/* Body content */}
        <div className="space-y-8 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" />
              1. Introduction
            </h2>
            <p>
              Technula HIMS (“we”, “our”, or “us”) operates the Technula Hospital Information Management System and the
              Technula HIMS Patient Portal mobile application. We are committed to protecting the privacy, confidentiality,
              and security of your personal health information (PHI) and personally identifiable information (PII).
            </p>
            <p className="mt-2">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website
              or use our patient mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-300">
              <li>
                <strong className="text-slate-100">Personal Identification Data:</strong> Full name, phone number, email address,
                date of birth, gender, and residential address.
              </li>
              <li>
                <strong className="text-slate-100">Electronic Medical Records (EMR):</strong> Consultation history, vitals,
                diagnostic reports, lab investigation packages, radiology images, and prescription orders.
              </li>
              <li>
                <strong className="text-slate-100">ABHA & Government Identity Data:</strong> Ayushman Bharat Health Account (ABHA)
                number/address, Aadhaar OTP verification metadata, or other government identity tokens required for healthcare verification.
              </li>
              <li>
                <strong className="text-slate-100">Billing & Payment Data:</strong> Invoice amounts, payment statuses, and transaction
                identifiers processed securely via accredited payment gateways (PayU). We do not store full credit card numbers or banking passwords.
              </li>
              <li>
                <strong className="text-slate-100">Device & Telemetry Information:</strong> Mobile device identifiers, push notification tokens,
                and application performance metrics to deliver appointment alerts and emergency notifications.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. Mobile Device Permissions Requested</h2>
            <p>The Technula HIMS Patient mobile app may request the following permissions on your device:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-teal-300 text-xs block">CAMERA</span>
                <span className="text-xs text-slate-400">Used for live doctor-patient teleconsultation video calls and scanning medical reports.</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-teal-300 text-xs block">MICROPHONE / RECORD_AUDIO</span>
                <span className="text-xs text-slate-400">Used during real-time teleconsultation calls to communicate with your healthcare provider.</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-teal-300 text-xs block">NOTIFICATIONS / PUSH</span>
                <span className="text-xs text-slate-400">Used to deliver appointment reminders, prescription updates, lab result readiness, and SOS alerts.</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-teal-300 text-xs block">STORAGE / DOCUMENTS</span>
                <span className="text-xs text-slate-400">Used strictly when you upload external medical records or download generated invoice PDFs.</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>Facilitating outpatient and inpatient hospital care with your chosen healthcare provider.</li>
              <li>Transmitting and managing prescriptions, lab orders, and radiology results.</li>
              <li>Connecting video and audio consultations with certified physicians.</li>
              <li>Delivering critical healthcare alerts (e.g., SOS emergency response, blood donor requests).</li>
              <li>Complying with statutory medical reporting and Ayushman Bharat Digital Mission (ABDM) standards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. Data Protection and Encryption</h2>
            <p>
              We apply enterprise-grade safeguards to protect your personal and medical data:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
              <li>All network transmissions are encrypted using Transport Layer Security (TLS 1.2 / TLS 1.3).</li>
              <li>Health records and sensitive fields are encrypted at rest using industry-standard AES-256 encryption.</li>
              <li>Access controls are restricted via strict role-based authorization (RBAC) and tenant isolation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. Data Retention and Deletion</h2>
            <p>
              We retain medical records for the minimum retention period required by applicable medical record laws and health authority regulations.
              You may request access to, correction of, or deletion of your personal account by contacting our data protection officer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Contact Information</h2>
            <p>If you have any questions or concerns regarding this Privacy Policy or our data practices, please contact us at:</p>
            <div className="mt-3 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-teal-400" />
                <span>info@technula.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-teal-400" />
                <span>+91 9911020199</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span>Technula Software Solutions · Hospital Information Management Division</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700/60 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Technula HIMS. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

