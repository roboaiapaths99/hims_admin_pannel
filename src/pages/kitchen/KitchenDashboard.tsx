import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { UtensilsCrossed, Clock, CheckCircle, ChefHat, Truck, Filter } from 'lucide-react';

interface DietOrder {
  id: string;
  admission_id: string;
  patient_name: string | null;
  room_number: string | null;
  meal_type: string;
  diet_type: string;
  special_instructions: string | null;
  delivery_time: string | null;
  status: string;
  created_at: string;
  created_by_role?: string;
}

const statusFlow: Record<string, { label: string; next: string | null; color: string; icon: any }> = {
  ordered: { label: 'Ordered', next: 'preparing', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  preparing: { label: 'Preparing', next: 'prepared', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ChefHat },
  prepared: { label: 'Ready', next: 'delivered', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle },
  delivered: { label: 'Delivered', next: null, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Truck }
};

const mealColors: Record<string, string> = {
  breakfast: 'bg-orange-100 text-orange-700',
  lunch: 'bg-yellow-100 text-yellow-700',
  dinner: 'bg-purple-100 text-purple-700',
  snack: 'bg-pink-100 text-pink-700'
};

const dietLabels: Record<string, string> = {
  regular: 'Regular',
  diabetic: 'Diabetic',
  liquid: 'Liquid Only',
  low_sodium: 'Low Sodium',
  soft: 'Soft Diet',
  npo: 'NPO (Nil by Mouth)'
};

const KitchenDashboard: React.FC = () => {
  const [orders, setOrders] = useState<DietOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMeal, setFilterMeal] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status_filter = filterStatus;
      if (filterMeal) params.meal_type = filterMeal;
      const res = await apiClient.get('/api/ipd/diet-orders', { params });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load diet orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus, filterMeal]);

  const advanceStatus = async (order: DietOrder, newStatus: string) => {
    let instructions = order.special_instructions || '';
    if (newStatus === 'delivered') {
      const person = prompt("Enter Delivery Personnel Name (e.g. John Doe, Kitchen staff):");
      if (person) {
        instructions = instructions 
          ? `${instructions}. Delivered by: ${person}` 
          : `Delivered by: ${person}`;
      }
    }
    try {
      await apiClient.put(`/api/ipd/diet-orders/${order.id}`, { 
        status: newStatus,
        special_instructions: instructions
      });
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update order');
    }
  };

  const activeCounts = {
    ordered: orders.filter(o => o.status === 'ordered').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    prepared: orders.filter(o => o.status === 'prepared').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          Kitchen Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage dietary prescriptions and meal preparation workflow</p>
      </div>

      {/* Status Pipeline Cards */}
      <div data-tour="kitchen-pipeline" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusFlow).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className={`rounded-xl p-4 border text-left transition-all ${
                filterStatus === key ? val.color + ' ring-2 ring-offset-1 ring-slate-400' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{val.label}</span>
              </div>
              <p className="text-2xl font-bold">{(activeCounts as any)[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Meal Type Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-600">Meal:</span>
        {['', 'breakfast', 'lunch', 'dinner', 'snack'].map(m => (
          <button
            key={m}
            onClick={() => setFilterMeal(m)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              filterMeal === m
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div data-tour="kitchen-orders-list" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Patient</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Room</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Meal</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Diet Type</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Instructions</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading diet orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No diet orders found
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const sf = statusFlow[order.status];
                const StatusIcon = sf?.icon || Clock;
                return (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-800">{order.patient_name || 'Unknown'}</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                          order.created_by_role === 'patient' 
                            ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {order.created_by_role === 'patient' ? 'Patient Order' : 'Clinical Prescription'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">
                      {order.room_number || '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase ${mealColors[order.meal_type] || 'bg-slate-100 text-slate-600'}`}>
                        {order.meal_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium">
                      {dietLabels[order.diet_type] || order.diet_type}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={order.special_instructions || ''}>
                      {order.special_instructions || '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${sf?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sf?.label || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {sf?.next ? (
                        <button
                          onClick={() => advanceStatus(order, sf.next!)}
                          className="text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                        >
                          {sf.next === 'preparing' ? 'Start Prep' :
                           sf.next === 'prepared' ? 'Mark Ready' :
                           sf.next === 'delivered' ? 'Mark Delivered' : 'Next'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KitchenDashboard;
