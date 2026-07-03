import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Loader2, Plus, CheckCircle, XCircle, ShieldAlert, Award } from 'lucide-react';

interface TPAProvider {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export const TPASettings: React.FC = () => {
  const [providers, setProviders] = useState<TPAProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/tpa/providers');
      setProviders(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load TPA providers.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        code: code.toUpperCase(),
        is_active: isActive,
      };
      const res = await apiClient.post('/api/tpa/providers', payload);
      setProviders([...providers, res.data]);
      setName('');
      setCode('');
      setIsActive(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to register TPA provider.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <Award className="h-6 w-6 text-teal-600" />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">TPA & Insurance Providers Settings</h2>
          <p className="text-xs text-slate-500 font-semibold">Register and manage Third Party Administrators (TPA) partners for direct insurance claims processing.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add TPA Provider */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-fit">
          <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">Register TPA Provider</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Provider Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. Star Health Insurance"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unique Code Prefix</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. STARHLTH"
              />
            </div>
            <div className="flex items-center space-x-2.5 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="is_active" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                Mark Provider as Active
              </label>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || !name || !code}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Add TPA Provider
              </button>
            </div>
          </form>
        </div>

        {/* Right List: Providers Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Registered TPA Partners</h4>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Provider Name</th>
                  <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Code Prefix</th>
                  <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-xs">
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-medium">
                      No TPA providers registered yet.
                    </td>
                  </tr>
                ) : (
                  providers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="px-6 py-3 text-slate-600 font-mono">{p.code}</td>
                      <td className="px-6 py-3">
                        {p.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                            <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-650 border border-slate-200">
                            <XCircle className="h-3 w-3 mr-1 text-slate-500" /> Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default TPASettings;
