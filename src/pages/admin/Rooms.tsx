import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Building, Plus, AlertCircle, Loader2, Bed, CheckCircle, XCircle, Settings } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  hourly_rate: number;
  status: string;
}

export const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Private');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/config/rooms');
      setRooms(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load room configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const branchId = localStorage.getItem('hmis_current_branch_id');
      if (!branchId) {
        throw new Error('Please select a branch first in the header dropdown.');
      }
      await apiClient.post('/api/config/rooms', {
        room_number: roomNumber,
        room_type: roomType,
        hourly_rate: parseFloat(hourlyRate),
        status: 'available',
        branch_id: branchId
      });
      setRoomNumber('');
      setHourlyRate('');
      await fetchRooms();
    } catch (err: any) {
      setError(err.message || err.response?.data?.detail || 'Failed to configure room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Ward & Operating Theatre (OT) Setup</h1>
        <p className="text-slate-500 text-sm">Configure hospital room numbers, bed counts, ward types, and surgical suite hourly rates.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Add Room Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
            <Plus className="h-5 w-5 text-teal-600 mr-2" /> Add Room / OT Suite
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Room / OT Number</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Suite 302 / OT-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Room Classification</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="General Ward">General Ward Bed</option>
                <option value="Semi-Private">Semi-Private Room</option>
                <option value="Private">Private AC Room</option>
                <option value="Deluxe Suite">Deluxe Suite</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="OT">Operating Theatre (OT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Hourly / Daily Base Rate (INR)</label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="250.00"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Room Setup'}
            </button>
          </form>
        </div>

        {/* Right Table Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <Bed className="h-5 w-5 text-teal-600 mr-2" /> Registered Rooms & OT Suites
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {rooms.length} Units
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
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Room / Suite No.</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Classification</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Base Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No rooms or OT suites configured for this branch.
                    </td>
                  </tr>
                ) : (
                  rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{r.room_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{r.room_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        ₹ {r.hourly_rate.toFixed(2)} {r.room_type === 'OT' ? '/ hr' : '/ day'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          r.status === 'available' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {r.status === 'available' ? 'Available' : 'Occupied'}
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
export default Rooms;
