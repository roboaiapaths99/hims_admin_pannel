import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Shield, Plus, Loader2, Calendar, AlertCircle } from 'lucide-react';

interface PatientPolicy {
  id: string;
  insurance_company: string;
  policy_number: string;
  card_number: string;
  valid_till: string;
  sum_insured: number;
}

interface PatientPolicyProps {
  patientId?: string;
}

export const PatientPolicyComponent: React.FC<PatientPolicyProps> = ({ patientId: propPatientId }) => {
  const { id: routePatientId } = useParams<{ id: string }>();
  const patientId = propPatientId || routePatientId || '';
  const [policies, setPolicies] = useState<PatientPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [insCompany, setInsCompany] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [validTill, setValidTill] = useState('');
  const [sumInsured, setSumInsured] = useState('');

  useEffect(() => {
    if (patientId) {
      fetchPolicies();
    }
  }, [patientId]);

  const fetchPolicies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/tpa/policies/patient/${patientId}`);
      setPolicies(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch policy details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insCompany || !policyNum || !cardNum || !validTill || !sumInsured) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        patient_id: patientId,
        insurance_company: insCompany,
        policy_number: policyNum,
        card_number: cardNum,
        valid_till: new Date(validTill).toISOString(),
        sum_insured: parseFloat(sumInsured)
      };
      const res = await apiClient.post('/api/tpa/policies', payload);
      setPolicies([...policies, res.data]);
      setInsCompany('');
      setPolicyNum('');
      setCardNum('');
      setValidTill('');
      setSumInsured('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save policy card.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center">
          <Shield className="h-4.5 w-4.5 text-teal-600 mr-2" /> Add Policy / Insurance Card
        </h3>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-start space-x-2 mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insurance Company</label>
            <input
              type="text"
              required
              value={insCompany}
              onChange={(e) => setInsCompany(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. Star Health"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Policy Number</label>
            <input
              type="text"
              required
              value={policyNum}
              onChange={(e) => setPolicyNum(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. POL-123"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card/Member ID</label>
            <input
              type="text"
              required
              value={cardNum}
              onChange={(e) => setCardNum(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. CARD-456"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Till</label>
              <input
                type="date"
                required
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sum Insured (INR)</label>
              <input
                type="number"
                required
                min="1"
                value={sumInsured}
                onChange={(e) => setSumInsured(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. 300000"
              />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-teal-650 hover:bg-teal-700 bg-teal-650 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Register Policy
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-655">Registered Policy Cards</h4>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="animate-spin h-6 w-6 text-teal-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Policy Number</th>
                <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Card/Member ID</th>
                <th className="px-6 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Valid Till</th>
                <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Sum Insured</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-xs">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No insurance policies registered yet.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-semibold text-slate-800">{p.insurance_company}</td>
                    <td className="px-6 py-3 text-slate-600 font-mono">{p.policy_number}</td>
                    <td className="px-6 py-3 text-slate-600 font-mono">{p.card_number}</td>
                    <td className="px-6 py-3 text-slate-500 font-mono">{new Date(p.valid_till).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-800">₹{p.sum_insured.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default PatientPolicyComponent;
