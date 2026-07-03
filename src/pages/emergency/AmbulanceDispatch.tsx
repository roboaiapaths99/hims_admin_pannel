import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Truck, Plus, X, MapPin, Phone, User, Clock, CheckCircle } from 'lucide-react';

interface AmbulanceBooking {
  id: string;
  driver_name: string | null;
  vehicle_number: string | null;
  pickup_address: string;
  patient_name: string | null;
  patient_phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  dispatched: 'bg-amber-50 text-amber-700 border-amber-200',
  arrived: 'bg-blue-50 text-blue-700 border-blue-200',
  en_route_hospital: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200'
};

const statusLabels: Record<string, string> = {
  dispatched: 'Dispatched',
  arrived: 'Arrived at Location',
  en_route_hospital: 'En Route to Hospital',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const AmbulanceDispatch: React.FC = () => {
  const [bookings, setBookings] = useState<AmbulanceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [formDriver, setFormDriver] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPatient, setFormPatient] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status_filter = filterStatus;
      const res = await apiClient.get('/api/emergency/ambulance', { params });
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load ambulance bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [filterStatus]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/api/emergency/ambulance/book', {
        driver_name: formDriver || null,
        vehicle_number: formVehicle || null,
        pickup_address: formAddress,
        patient_name: formPatient || null,
        patient_phone: formPhone || null,
        notes: formNotes || null
      });
      setShowModal(false);
      setFormDriver(''); setFormVehicle(''); setFormAddress(''); setFormPatient(''); setFormPhone(''); setFormNotes('');
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to dispatch ambulance');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.put(`/api/emergency/ambulance/${id}`, { status: newStatus });
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const nextStatus = (current: string): { label: string; value: string } | null => {
    switch (current) {
      case 'dispatched': return { label: 'Mark Arrived', value: 'arrived' };
      case 'arrived': return { label: 'En Route to Hospital', value: 'en_route_hospital' };
      case 'en_route_hospital': return { label: 'Mark Completed', value: 'completed' };
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-600" />
            Ambulance Dispatch
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage ambulance dispatch and tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Dispatch Ambulance
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: 'All' },
          { key: 'dispatched', label: 'Dispatched' },
          { key: 'arrived', label: 'Arrived' },
          { key: 'en_route_hospital', label: 'En Route' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              filterStatus === tab.key
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400">Loading ambulance bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            <Truck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No ambulance bookings found
          </div>
        ) : (
          bookings.map(b => {
            const next = nextStatus(b.status);
            return (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[b.status] || 'bg-slate-50 text-slate-600'}`}>
                    {statusLabels[b.status] || b.status}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatTime(b.created_at)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-800 font-medium">{b.pickup_address}</p>
                  </div>
                  {b.patient_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{b.patient_name}</span>
                    </div>
                  )}
                  {b.patient_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600 font-mono text-xs">{b.patient_phone}</span>
                    </div>
                  )}
                  {b.driver_name && (
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold">Driver:</span> {b.driver_name} {b.vehicle_number ? `(${b.vehicle_number})` : ''}
                    </p>
                  )}
                  {b.notes && (
                    <p className="text-xs text-slate-400 italic">{b.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {next && (
                    <button
                      onClick={() => updateStatus(b.id, next.value)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="h-3 w-3" />{next.label}
                    </button>
                  )}
                  {b.status !== 'completed' && b.status !== 'cancelled' && (
                    <button
                      onClick={() => updateStatus(b.id, 'cancelled')}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Dispatch Ambulance
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pickup Address *</label>
                <textarea
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Full pickup address..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={formPatient}
                    onChange={(e) => setFormPatient(e.target.value)}
                    placeholder="Patient name"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={formDriver}
                    onChange={(e) => setFormDriver(e.target.value)}
                    placeholder="Driver name"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value)}
                    placeholder="DL 01 AB 1234"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {submitting ? 'Dispatching...' : 'Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbulanceDispatch;
