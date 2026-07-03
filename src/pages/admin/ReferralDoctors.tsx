import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Users, Plus, Edit2, Search, X, Phone, Building, Stethoscope, Percent } from 'lucide-react';

interface CommissionRule {
  department_or_service: string;
  percentage: number;
}

interface ReferringDoctor {
  id: string;
  name: string;
  hospital_name?: string;
  phone?: string;
  specialty?: string;
  commission_rules: CommissionRule[];
  is_active: boolean;
  created_at: string;
}

const ReferralDoctors: React.FC = () => {
  const [doctors, setDoctors] = useState<ReferringDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<ReferringDoctor | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formHospital, setFormHospital] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formRules, setFormRules] = useState<CommissionRule[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await apiClient.get('/api/referrals/doctors', { params });
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to load referring doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchDoctors(), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setFormName('');
    setFormHospital('');
    setFormPhone('');
    setFormSpecialty('');
    setFormRules([]);
    setShowModal(true);
  };

  const openEditModal = (doc: ReferringDoctor) => {
    setEditingDoctor(doc);
    setFormName(doc.name);
    setFormHospital(doc.hospital_name || '');
    setFormPhone(doc.phone || '');
    setFormSpecialty(doc.specialty || '');
    setFormRules(doc.commission_rules.length > 0 ? [...doc.commission_rules] : []);
    setShowModal(true);
  };

  const addRule = () => {
    setFormRules([...formRules, { department_or_service: '', percentage: 0 }]);
  };

  const removeRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: string, value: string | number) => {
    const updated = [...formRules];
    (updated[index] as any)[field] = value;
    setFormRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formName,
        hospital_name: formHospital || null,
        phone: formPhone || null,
        specialty: formSpecialty || null,
        commission_rules: formRules.filter(r => r.department_or_service.trim() !== '')
      };

      if (editingDoctor) {
        await apiClient.put(`/api/referrals/doctors/${editingDoctor.id}`, payload);
      } else {
        await apiClient.post('/api/referrals/doctors', payload);
      }
      setShowModal(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save referring doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (doc: ReferringDoctor) => {
    try {
      await apiClient.put(`/api/referrals/doctors/${doc.id}`, { is_active: !doc.is_active });
      fetchDoctors();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Referring Doctors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage external referring doctors and commission rules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Referring Doctor
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or hospital..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      {/* Doctors Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Doctor Name</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Hospital / Clinic</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Phone</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Specialty</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Commission Rules</th>
              <th className="text-center px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-center px-6 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">Loading referring doctors...</td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No referring doctors registered yet
                </td>
              </tr>
            ) : (
              doctors.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{doc.name}</td>
                  <td className="px-6 py-4 text-slate-600">{doc.hospital_name || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{doc.phone || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{doc.specialty || '—'}</td>
                  <td className="px-6 py-4">
                    {doc.commission_rules.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {doc.commission_rules.map((r, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                            {r.department_or_service}: {r.percentage}%
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">No rules set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(doc)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        doc.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEditModal(doc)}
                      className="text-slate-500 hover:text-teal-600 transition-colors"
                      title="Edit Doctor"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingDoctor ? 'Edit Referring Doctor' : 'Register Referring Doctor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Doctor Name *</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Hospital */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hospital / Clinic</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formHospital}
                    onChange={(e) => setFormHospital(e.target.value)}
                    placeholder="City Hospital"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  placeholder="Cardiology, Orthopedics..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Commission Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Commission Rules</label>
                  <button
                    type="button"
                    onClick={addRule}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Rule
                  </button>
                </div>

                {formRules.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No commission rules configured. Click "Add Rule" to define percentage-based commission splits.</p>
                ) : (
                  <div className="space-y-2">
                    {formRules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Department / Service"
                          value={rule.department_or_service}
                          onChange={(e) => updateRule(index, 'department_or_service', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="relative w-24">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={rule.percentage}
                            onChange={(e) => updateRule(index, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 pr-7 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Register Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDoctors;
