import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
          403 Access Denied
        </h1>
        
        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          Your account role profile does not have the necessary permissions to access this clinical or administrative dashboard resource. If you believe this is an error, please contact your branch system administrator.
        </p>
        
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
