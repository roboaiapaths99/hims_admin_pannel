import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { CreditCard, Plus, AlertCircle, Loader2, DollarSign, Settings, CheckCircle, XCircle } from 'lucide-react';

interface PricingItem {
  id: string;
  name: string;
  code: string;
  item_type: string;
  price: number;
  doctor_id: string | null;
  is_active: boolean;
}

export const Pricing: React.FC = () => {
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [itemType, setItemType] = useState('consultation');
  const [price, setPrice] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPricing();
    fetchDoctors();
  }, []);

  const fetchPricing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/config/pricing-items');
      setPricingItems(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load pricing master list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await apiClient.get('/api/org/users');
      // Filter only users with doctor role
      const docsOnly = res.data.filter((u: any) => ['doctor', 'surgeon', 'anesthetist'].includes(u.role));
      setDoctors(docsOnly);
    } catch (err) {
      console.error('Failed to load doctors list:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/config/pricing-items', {
        name,
        code: code.toUpperCase(),
        item_type: itemType,
        price: parseFloat(price),
        doctor_id: doctorId || null,
        is_active: true
      });
      setName('');
      setCode('');
      setPrice('');
      setDoctorId('');
      await fetchPricing();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create pricing item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Billing & Pricing Master</h1>
        <p className="text-slate-500 text-sm">Configure standard fees for consultations, diagnostic tests, hospital rooms, and OT charges.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
            <Plus className="h-5 w-5 text-teal-600 mr-2" /> Add Charge Item
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Item Category</label>
              <select
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value);
                  if (e.target.value !== 'consultation') setDoctorId('');
                }}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="consultation">OPD Consultation Fee</option>
                <option value="follow_up">Follow-up Visit Fee</option>
                <option value="lab_test">Lab Master Test</option>
                <option value="procedure">Procedure / Treatment</option>
                <option value="ot_charge">OT Booking / Surgeon Charge</option>
                <option value="room_charge">Room / Ward Daily Rate</option>
                <option value="diet">Dietary / Kitchen Catering Meal</option>
              </select>
            </div>

            {itemType === 'consultation' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Link to Doctor (Optional)</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">General OPD pricing (No specific doctor)</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name} ({d.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Item / Charge Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Senior Specialist Consultation"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Charge Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="CONS-SPEC"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Base Rate (INR)</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="500.00"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Price Item'}
            </button>
          </form>
        </div>

        {/* Right Table Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <CreditCard className="h-5 w-5 text-teal-600 mr-2" /> Registered Charge Catalog
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {pricingItems.length} Items
            </span>
          </div>
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name / Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Base Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pricingItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No pricing catalog entries created yet for this branch.
                    </td>
                  </tr>
                ) : (
                  pricingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                        {item.item_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        ₹ {item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.is_active ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
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
export default Pricing;
