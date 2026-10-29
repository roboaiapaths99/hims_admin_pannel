import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField } from '../../components/FormField';
import { Building, Save, Upload, Phone, MapPin, Hash, Image, FileText, Loader2, Check } from 'lucide-react';

export const HospitalProfile: React.FC = () => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [letterheadText, setLetterheadText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getFullLogoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${apiClient.defaults.baseURL || ''}${url}`;
    }
    return url;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/org/branches/current/profile');
      if (res.data) {
        setName(res.data.name || '');
        setCode(res.data.code || '');
        setAddress(res.data.address || '');
        setContactNumber(res.data.contact_number || '');
        setGstNumber(res.data.gst_number || '');
        setLogoUrl(res.data.logo_url || '');
        setLetterheadText(res.data.letterhead_text || '');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load branch profile. Make sure you are logged in to a branch-scoped account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/api/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data && res.data.url) {
        setLogoUrl(res.data.url);
        setSuccess('Logo uploaded successfully.');
      } else {
        setError('Failed to upload file.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'File upload failed. Ensure the format is valid.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiClient.put('/api/org/branches/current/profile', {
        name,
        code,
        address,
        contact_number: contactNumber,
        gst_number: gstNumber || null,
        logo_url: logoUrl || null,
        letterhead_text: letterheadText || null
      });
      if (res.data) {
        setSuccess('Hospital profile updated successfully.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Heading Card */}
      <div className="flex items-center space-x-3 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="p-3 bg-teal-50 rounded-lg text-teal-600">
          <Building className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hospital Profile Settings</h1>
          <p className="text-slate-500 text-sm">Configure branch-level business details, contact information, branding logos, and custom billing templates.</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-sm">Fetching hospital details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Form Card */}
          <div data-tour="profile-editor" className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Branch Details Editor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Branch / Hospital Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. City General Hospital"
                />
                <FormField
                  label="Branch Short Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="e.g. CGH"
                  disabled
                  helperText="Short code cannot be changed as it is locked to registry records"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">Contact Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      required
                      placeholder="+91 98765 43210"
                      className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">GST / Tax Registration Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Hash className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Physical Address</label>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter full physical branch address details..."
                    className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Invoice Letterhead Text</label>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-slate-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <textarea
                    value={letterheadText}
                    onChange={(e) => setLetterheadText(e.target.value)}
                    rows={4}
                    placeholder="Enter billing letterhead footer or disclaimer texts (e.g. Emergency helpline, thank you notes, policies)..."
                    className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-md cursor-pointer transition disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Profile Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* Logo & Branding Panel */}
          <div className="space-y-6">
            {/* Branding Card */}
            <div data-tour="profile-logo" className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <Image className="h-5 w-5 text-slate-500" />
                <span>Hospital Logo</span>
              </h2>
              <div className="flex flex-col items-center space-y-4">
                <div className="h-40 w-40 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden relative shadow-inner">
                  {logoUrl ? (
                    <img src={getFullLogoUrl(logoUrl)} alt="Hospital Logo" className="object-contain max-h-full max-w-full" />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-xs text-slate-400">No Logo Configured</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="w-full text-center">
                  <label className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition">
                    <Upload className="h-4 w-4" />
                    <span>Upload New Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">Recommended sizes: square aspect ratio, max size 1MB (PNG, JPG, SVG).</p>
                </div>

                <FormField
                  label="Logo URL (Manual Entry)"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Paste direct image URL..."
                />
              </div>
            </div>

            {/* Letterhead Preview Card */}
            <div data-tour="profile-preview" className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-md font-bold text-slate-800">Print Preview Example</h2>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3 font-sans text-[11px] shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    {logoUrl ? (
                      <img src={getFullLogoUrl(logoUrl)} alt="Preview Logo" className="h-6 w-6 object-contain" />
                    ) : (
                      <div className="h-6 w-6 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold">H</div>
                    )}
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{name || 'Hospital Name'}</span>
                      <span className="text-slate-400 block text-[9px]">{address || 'Hospital Address details'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block uppercase text-teal-700 text-[10px]">Tax Invoice</span>
                    <span className="text-slate-400 block">GST: {gstNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="h-10 border border-slate-200 border-dashed rounded flex items-center justify-center text-slate-400">
                  Patient Prescription & Invoice Items
                </div>
                <div className="border-t border-slate-200 pt-2 text-[8px] text-slate-400 text-center italic">
                  {letterheadText || 'This is a computer generated invoice and does not require signatures.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalProfile;
