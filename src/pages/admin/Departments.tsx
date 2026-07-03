import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField } from '../../components/FormField';
import { Building, Plus, AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({
    name: null,
    code: null
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/config/departments');
      setDepartments(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string | null> = {
      name: !name.trim() ? 'Department name is required' : null,
      code: !code.trim() ? 'Department code is required' : 
            code.trim().length < 2 ? 'Code must be at least 2 characters' : 
            code.trim().length > 6 ? 'Code must not exceed 6 characters' : null
    };

    setFormErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(err => err !== null);
    if (hasErrors) {
      setError('Please fix all validation errors above');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/config/departments', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        is_active: true
      });
      setName('');
      setCode('');
      setFormErrors({});
      await fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Departments Directory</h1>
        <p className="text-slate-500 text-sm">Configure clinical and administrative departments for OPD tokens and scheduling.</p>
      </div>

      {error && (
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
            <Plus className="h-5 w-5 text-teal-600 mr-2" /> Add Department
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Department Name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormErrors(prev => ({ ...prev, name: null }));
              }}
              error={formErrors.name}
              required
              placeholder="Pediatrics Ward"
            />
            <FormField
              label="Department Code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setFormErrors(prev => ({ ...prev, code: null }));
              }}
              error={formErrors.code}
              required
              maxLength={6}
              placeholder="PED"
              helperText="2-6 character code (will be uppercase)"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Department'}
            </button>
          </form>
        </div>

        {/* Right Side: Departments Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <Building className="h-5 w-5 text-teal-600 mr-2" /> Active Departments
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
              {departments.length} Scoped
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
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-500 text-sm font-medium">
                      No departments configured for this branch.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{d.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{d.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          d.is_active ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {d.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {d.is_active ? 'Active' : 'Inactive'}
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
export default Departments;
