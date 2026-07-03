import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { CreditCard, Shield, Key, CheckCircle, AlertTriangle, Save, RefreshCw, Plus, Trash2, Globe, HelpCircle, Power } from 'lucide-react';

interface CustomPaymentMethod {
  id: string;
  name: string;
  payment_type: 'offline' | 'online_gateway' | 'qr_code';
  is_active: boolean;
  instructions?: string;
  config_keys?: Record<string, string>;
}

interface PaymentSettingsData {
  payu_enabled: boolean;
  payu_merchant_key: string;
  payu_merchant_salt: string;
  payu_env: 'test' | 'production';
  razorpay_enabled: boolean;
  razorpay_key_id: string;
  razorpay_key_secret: string;
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  upi_enabled: boolean;
  upi_vpa: string;
  upi_merchant_name: string;
  cash_enabled: boolean;
  card_enabled: boolean;
  custom_methods: CustomPaymentMethod[];
}

export const PaymentSettings: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettingsData>({
    payu_enabled: true,
    payu_merchant_key: '',
    payu_merchant_salt: '',
    payu_env: 'test',
    razorpay_enabled: false,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    stripe_enabled: false,
    stripe_publishable_key: '',
    stripe_secret_key: '',
    upi_enabled: false,
    upi_vpa: '',
    upi_merchant_name: '',
    cash_enabled: true,
    card_enabled: true,
    custom_methods: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for creating a new custom method
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'offline' | 'online_gateway' | 'qr_code'>('offline');
  const [newMethodInstructions, setNewMethodInstructions] = useState('');
  const [newMethodKeyName, setNewMethodKeyName] = useState('');
  const [newMethodKeyValue, setNewMethodKeyValue] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/api/org/branches/settings/payments');
        setSettings({
          payu_enabled: res.data.payu_enabled !== false,
          payu_merchant_key: res.data.payu_merchant_key || '',
          payu_merchant_salt: res.data.payu_merchant_salt || '',
          payu_env: res.data.payu_env || 'test',
          razorpay_enabled: !!res.data.razorpay_enabled,
          razorpay_key_id: res.data.razorpay_key_id || '',
          razorpay_key_secret: res.data.razorpay_key_secret || '',
          stripe_enabled: !!res.data.stripe_enabled,
          stripe_publishable_key: res.data.stripe_publishable_key || '',
          stripe_secret_key: res.data.stripe_secret_key || '',
          upi_enabled: !!res.data.upi_enabled,
          upi_vpa: res.data.upi_vpa || '',
          upi_merchant_name: res.data.upi_merchant_name || '',
          cash_enabled: res.data.cash_enabled !== false,
          card_enabled: res.data.card_enabled !== false,
          custom_methods: res.data.custom_methods || [],
        });
      } catch (err: any) {
        console.error('Failed to load payment settings', err);
        setMessage({ type: 'error', text: 'Failed to load branch payment settings. Please try again.' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (name: keyof PaymentSettingsData) => {
    setSettings((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleCustomMethodToggle = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      custom_methods: prev.custom_methods.map((method) =>
          method.id === id ? { ...method, is_active: !method.is_active } : method
      ),
    }));
  };

  const handleCustomMethodDelete = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      custom_methods: prev.custom_methods.filter((method) => method.id !== id),
    }));
  };

  const handleAddCustomMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;

    const newMethod: CustomPaymentMethod = {
      id: `pm_${Date.now()}`,
      name: newMethodName.trim(),
      payment_type: newMethodType,
      is_active: true,
      instructions: newMethodInstructions.trim() || undefined,
      config_keys: newMethodKeyName.trim()
          ? { [newMethodKeyName.trim()]: newMethodKeyValue }
          : undefined,
    };

    setSettings((prev) => ({
      ...prev,
      custom_methods: [...prev.custom_methods, newMethod],
    }));

    // Reset fields
    setNewMethodName('');
    setNewMethodType('offline');
    setNewMethodInstructions('');
    setNewMethodKeyName('');
    setNewMethodKeyValue('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put('/api/org/branches/settings/payments', settings);
      setMessage({ type: 'success', text: 'Branch payment settings updated successfully!' });
    } catch (err: any) {
      console.error('Failed to save payment settings', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update payment settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mr-3" />
        <span className="text-slate-600 font-medium">Loading branch gateway configurations...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Payment Gateway Settings</h1>
        <p className="text-slate-500 text-sm">Configure online payment gateways, add custom local methods, and customize options for invoice settlement.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Method Toggles */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-teal-600" /> Standard Payment Methods
          </h2>
          <p className="text-slate-500 text-xs mb-6">Enable or disable standard out-of-the-box payment options.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">Cash Payment</p>
                <p className="text-slate-500 text-xs mt-0.5">Collect cash at counter</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('cash_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.cash_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.cash_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">Debit / Credit Card</p>
                <p className="text-slate-500 text-xs mt-0.5">Counter POS terminal</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('card_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.card_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.card_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">PayU Gateway</p>
                <p className="text-slate-500 text-xs mt-0.5">Online checkout via PayU</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('payu_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.payu_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.payu_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">Razorpay Gateway</p>
                <p className="text-slate-500 text-xs mt-0.5">Online checkout via Razorpay</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('razorpay_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.razorpay_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.razorpay_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">Stripe Payments</p>
                <p className="text-slate-500 text-xs mt-0.5">Online checkout via Stripe</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('stripe_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.stripe_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.stripe_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
              <div>
                <p className="text-sm font-bold text-slate-800">Direct UPI QR</p>
                <p className="text-slate-500 text-xs mt-0.5">Collect via Dynamic QR Code</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('upi_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.upi_enabled ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.upi_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Custom payment methods list */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-teal-600" /> Custom / Branch-specific Payment Methods
          </h2>
          <p className="text-slate-500 text-xs mb-6">Create custom payment types (e.g. Paytm Business, Stripe India, Bank NEFT) specific to your hospital branch operations.</p>

          <div className="space-y-4">
            {settings.custom_methods.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-semibold">No custom payment methods registered yet.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {settings.custom_methods.map((method) => (
                  <div key={method.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-slate-800">{method.name}</p>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded uppercase">
                          {method.payment_type.replace('_', ' ')}
                        </span>
                      </div>
                      {method.instructions && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{method.instructions}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleCustomMethodToggle(method.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          method.is_active
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                        title={method.is_active ? 'Active (Click to Deactivate)' : 'Inactive (Click to Activate)'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomMethodDelete(method.id)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Method Adder */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Plus className="h-4 w-4 mr-1 text-teal-600" /> Add Custom Payment Gateway/Method
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Method Name</label>
                  <input
                    type="text"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="e.g. HDFC Gateway, Paytm Business QR"
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Method Category</label>
                  <select
                    value={newMethodType}
                    onChange={(e) => setNewMethodType(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="offline">Offline Counter Entry (Ref required)</option>
                    <option value="qr_code">Instant UPI QR Code Scan</option>
                    <option value="online_gateway">Online Third-party API Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operator Instructions</label>
                <input
                  type="text"
                  value={newMethodInstructions}
                  onChange={(e) => setNewMethodInstructions(e.target.value)}
                  placeholder="e.g. Instruct customer to transfer to A/C 12345678 and input UTR reference code."
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {newMethodType === 'online_gateway' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Config Key Name</label>
                    <input
                      type="text"
                      value={newMethodKeyName}
                      onChange={(e) => setNewMethodKeyName(e.target.value)}
                      placeholder="e.g. api_key, merchant_id"
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Config Secret Value</label>
                    <input
                      type="password"
                      value={newMethodKeyValue}
                      onChange={(e) => setNewMethodKeyValue(e.target.value)}
                      placeholder="e.g. sk_live_••••••••••••"
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddCustomMethod}
                className="inline-flex items-center px-4 py-2 border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-all"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add to Active List
              </button>
            </div>
          </div>
        </div>

        {/* PayU configurations */}
        {settings.payu_enabled && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-teal-600" /> PayU Gateway Setup
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 rounded-full border border-teal-100 uppercase">
                PayU Option Active
              </span>
            </div>

            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Specify unique branch PayU merchant key and salt. Defaults to sandbox keys if left blank.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      name="payu_merchant_key"
                      value={settings.payu_merchant_key}
                      onChange={handleChange}
                      placeholder="e.g. gtK42w"
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant Salt</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      name="payu_merchant_salt"
                      value={settings.payu_merchant_salt}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gateway Environment Mode</label>
                <select
                  name="payu_env"
                  value={settings.payu_env}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="test">Sandbox Test Environment</option>
                  <option value="production">Production Live Mode</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Razorpay configurations */}
        {settings.razorpay_enabled && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-teal-600" /> Razorpay Gateway Setup
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 rounded-full border border-teal-100 uppercase">
                Razorpay Active
              </span>
            </div>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Specify your branch Razorpay API credentials. Uses default test key if left blank.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Key ID</label>
                <input
                  type="text"
                  name="razorpay_key_id"
                  value={settings.razorpay_key_id}
                  onChange={handleChange}
                  placeholder="e.g. rzp_test_..."
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Key Secret</label>
                <input
                  type="password"
                  name="razorpay_key_secret"
                  value={settings.razorpay_key_secret}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Stripe configurations */}
        {settings.stripe_enabled && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-teal-600" /> Stripe Gateway Setup
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 rounded-full border border-teal-100 uppercase">
                Stripe Active
              </span>
            </div>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Specify your Stripe API keys. Uses sandbox details if left blank.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Publishable Key</label>
                <input
                  type="text"
                  name="stripe_publishable_key"
                  value={settings.stripe_publishable_key}
                  onChange={handleChange}
                  placeholder="e.g. pk_test_..."
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secret Key</label>
                <input
                  type="password"
                  name="stripe_secret_key"
                  value={settings.stripe_secret_key}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* UPI QR configurations */}
        {settings.upi_enabled && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-teal-600" /> UPI QR Code Configuration
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 rounded-full border border-teal-100 uppercase">
                UPI QR Active
              </span>
            </div>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Define the UPI Virtual Payment Address (VPA) and Merchant Name for direct checkout QR generation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">UPI VPA / ID</label>
                <input
                  type="text"
                  name="upi_vpa"
                  value={settings.upi_vpa}
                  onChange={handleChange}
                  placeholder="e.g. billing@okhdfcbank"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant/Business Display Name</label>
                <input
                  type="text"
                  name="upi_merchant_name"
                  value={settings.upi_merchant_name}
                  onChange={handleChange}
                  placeholder="e.g. City Hospital Billing Desk"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all border-0"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving Settings...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default PaymentSettings;
