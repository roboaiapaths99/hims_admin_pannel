import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { 
  CreditCard, Shield, CheckCircle, XCircle, 
  Loader2, AlertCircle, Sparkles, Server, Users, 
  Layers, ArrowRight, Zap, RefreshCw, Check
} from 'lucide-react';

interface SaaSPlan {
  plan_id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
  max_branches: number;
  max_staff: number;
  max_patients: number;
  features: {
    abdm: boolean;
    ai_summaries: boolean;
    telemedicine: boolean;
  };
  description: string;
}

interface SaaSStatus {
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
  status: string;
  subscription: {
    plan_id: string;
    status: string;
    end_date: string | null;
    billing_interval: string;
    features: {
      abdm: boolean;
      ai_summaries: boolean;
      telemedicine: boolean;
    };
  };
  limits: {
    max_branches: number;
    max_staff: number;
    max_patients: number;
  };
  usage: {
    branches: number;
    staff: number;
    patients: number;
  };
}

export const SaaSBilling: React.FC = () => {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [statusInfo, setStatusInfo] = useState<SaaSStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Billing interval toggle
  const [isAnnual, setIsAnnual] = useState(false);

  // Modal and checkout state
  const [selectedPlan, setSelectedPlan] = useState<SaaSPlan | null>(null);
  const [checkoutGateway, setCheckoutGateway] = useState<string>('sandbox');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [mockCardNumber, setMockCardNumber] = useState('4242 4242 4242 4242');
  const [mockCardExpiry, setMockCardExpiry] = useState('12/29');
  const [mockCardCvc, setMockCardCvc] = useState('123');

  useEffect(() => {
    fetchSaaSData();
  }, []);

  const fetchSaaSData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, statusRes] = await Promise.all([
        apiClient.get('/api/saas/plans'),
        apiClient.get('/api/saas/subscription/status')
      ]);
      setPlans(plansRes.data);
      setStatusInfo(statusRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch SaaS subscription data. Verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribeClick = (plan: SaaSPlan) => {
    setSelectedPlan(plan);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !statusInfo) return;

    setIsProcessingCheckout(true);
    setError(null);
    setSuccessMsg(null);

    const targetInterval = isAnnual ? 'year' : 'month';
    let targetAmount = selectedPlan.price;
    if (isAnnual) {
      targetAmount = (selectedPlan.price * 12) * 0.8;
    }

    try {
      // 1. Initialize transaction
      const initRes = await apiClient.post('/api/saas/subscription/subscribe', {
        plan_id: selectedPlan.plan_id,
        gateway: checkoutGateway,
        billing_interval: targetInterval
      });

      const params = initRes.data;

      // 2. Redirect if using PayU gateway
      if (checkoutGateway === 'payu') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = params.action_url;

        const fields = {
          key: params.key,
          txnid: params.txnid,
          amount: params.amount.toFixed(2),
          productinfo: params.productinfo,
          firstname: params.firstname,
          email: params.email,
          phone: params.phone,
          surl: params.surl,
          furl: params.furl,
          hash: params.hash
        };

        Object.entries(fields).forEach(([name, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Simulate a small delay for sandbox verification checkout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Verify sandbox mock payment on backend
      const verifyRes = await apiClient.post('/api/saas/subscription/verify', {
        plan_id: selectedPlan.plan_id,
        gateway: checkoutGateway,
        transaction_id: params.txnid,
        amount: params.amount,
        billing_interval: targetInterval
      });

      setSuccessMsg(verifyRes.data.message);
      setSelectedPlan(null);
      await fetchSaaSData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete SaaS subscription checkout.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You will lose access to premium modules at the end of your billing cycle.")) return;
    
    setIsLoading(true);
    try {
      await apiClient.post('/api/saas/subscription/cancel');
      setSuccessMsg("Subscription cancellation request registered.");
      await fetchSaaSData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to cancel subscription.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !statusInfo) {
    return (
      <div className="py-24 flex flex-col justify-center items-center">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600 mb-3" />
        <p className="text-slate-500 font-medium">Loading SaaS Billing Console...</p>
      </div>
    );
  }

  // Helper values
  const currentPlanId = statusInfo?.subscription?.plan_id || 'free_trial';
  const subStatus = statusInfo?.subscription?.status || 'trialing';
  const subEndDateStr = statusInfo?.subscription?.end_date;
  const limits = statusInfo?.limits;
  const usage = statusInfo?.usage;

  const daysLeft = subEndDateStr ? Math.ceil((new Date(subEndDateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto px-1">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <CreditCard className="h-7 w-7 text-teal-600 mr-2" /> SaaS Subscription Settings
        </h1>
        <p className="text-slate-500 text-sm">Manage your multi-branch enterprise tier, track usage metrics against plan quotas, and update your payment setups.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3 shadow-sm animate-pulse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-lg flex items-start space-x-3 shadow-sm">
          <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-teal-800">{successMsg}</p>
        </div>
      )}

      {/* Subscription Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-teal-500/20 text-teal-300 font-bold uppercase px-3 py-1 rounded-full border border-teal-500/30">
                Active Client Environment
              </span>
              {subStatus === 'suspended' && (
                <span className="text-xs bg-red-500/20 text-red-300 font-bold uppercase px-3 py-1 rounded-full border border-red-500/30 animate-pulse">
                  Suspended
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black">{statusInfo?.tenant_name}</h2>
            <p className="text-slate-300 text-sm font-mono">{statusInfo?.subdomain}.himsplatform.com</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Tier</p>
            <p className="text-xl font-black text-teal-300 mt-1 uppercase">
              {plans.find(p => p.plan_id === currentPlanId)?.name || 'Free Trial'}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiration status</p>
            <p className="text-xl font-black mt-1">
              {subEndDateStr ? (
                daysLeft > 0 ? (
                  <span className="text-teal-400">{daysLeft} Days Left</span>
                ) : (
                  <span className="text-red-400">Expired</span>
                )
              ) : (
                <span className="text-teal-400">Never Expires</span>
              )}
            </p>
            {subEndDateStr && (
              <p className="text-slate-400 text-[10px] mt-1">
                Renew date: {new Date(subEndDateStr).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quota Progress Meters */}
      {limits && usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Branches Meter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">Hospital Branches</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{usage.branches} / {limits.max_branches > 9999 ? 'Unlimited' : limits.max_branches}</h3>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Server className="h-6 w-6" />
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${usage.branches >= limits.max_branches ? 'bg-red-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, (usage.branches / limits.max_branches) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 font-semibold">Scoped branches operating in regional networks.</p>
          </div>

          {/* Staff Meter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">Staff Members</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{usage.staff} / {limits.max_staff > 9999 ? 'Unlimited' : limits.max_staff}</h3>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${usage.staff >= limits.max_staff ? 'bg-red-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, (usage.staff / limits.max_staff) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 font-semibold">Excludes patient portal user profiles.</p>
          </div>

          {/* Patients Meter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">Patient Folders</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{usage.patients} / {limits.max_patients > 99999 ? 'Unlimited' : limits.max_patients}</h3>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${usage.patients >= limits.max_patients ? 'bg-red-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, (usage.patients / limits.max_patients) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 font-semibold">Cumulative electronic health records.</p>
          </div>
        </div>
      )}

      {/* Pricing Matrix Toggle */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <Zap className="h-5 w-5 text-teal-600 mr-2" /> Select Subscription Plan
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Choose the plan that fits your hospital organization size. Save 20% on annual billing cycles.</p>
          </div>

          {/* Toggle Switch */}
          <div className="mt-4 md:mt-0 flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1.5 shadow-inner">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${!isAnnual ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Bill Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center ${isAnnual ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Bill Yearly <span className="ml-1.5 bg-teal-100 text-teal-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.plan_id === currentPlanId;
            let displayPrice = plan.price;
            if (isAnnual) {
              displayPrice = (plan.price * 12) * 0.8;
            }

            return (
              <div 
                key={plan.plan_id}
                className={`bg-white border rounded-2xl p-6 flex flex-col shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
                  isCurrent ? 'ring-2 ring-teal-600 border-teal-600' : 'border-slate-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-0 right-0 bg-teal-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Current Plan
                  </span>
                )}

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider">{plan.name}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 h-8">{plan.description}</p>
                </div>

                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900">
                    ₹{displayPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-400 text-xs font-semibold ml-1">
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>

                {/* Limits List */}
                <ul className="space-y-3 mb-8 text-xs font-medium text-slate-600 flex-1">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    Branches: <strong className="text-slate-800 ml-1">{plan.max_branches > 9999 ? 'Unlimited' : plan.max_branches}</strong>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    Staff Accounts: <strong className="text-slate-800 ml-1">{plan.max_staff > 9999 ? 'Unlimited' : plan.max_staff}</strong>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    Patient Records: <strong className="text-slate-800 ml-1">{plan.max_patients > 99999 ? 'Unlimited' : plan.max_patients.toLocaleString()}</strong>
                  </li>
                  <li className="flex items-center">
                    <span className={plan.features.abdm ? 'text-slate-800 flex items-center' : 'text-slate-300 line-through flex items-center'}>
                      <Check className={`h-4 w-4 mr-2 flex-shrink-0 ${plan.features.abdm ? 'text-teal-600' : 'text-slate-200'}`} />
                      ABDM Sandbox Verification
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className={plan.features.ai_summaries ? 'text-slate-800 flex items-center' : 'text-slate-300 line-through flex items-center'}>
                      <Check className={`h-4 w-4 mr-2 flex-shrink-0 ${plan.features.ai_summaries ? 'text-teal-600' : 'text-slate-200'}`} />
                      AI Summaries & Analytics
                    </span>
                  </li>
                </ul>

                <button
                  disabled={isCurrent && subStatus !== 'suspended'}
                  onClick={() => handleSubscribeClick(plan)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isCurrent 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200' 
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-md'
                  }`}
                >
                  {isCurrent ? 'Active Subscription' : 'Upgrade Plan'} <ArrowRight className="h-3 w-3 ml-1.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Action Section */}
      {subStatus === 'active' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Cancel SaaS Subscription</h3>
            <p className="text-slate-500 text-xs mt-0.5">Cancelling stops automated renewals. You keep active tier credentials until the current period ends.</p>
          </div>
          <button
            onClick={handleCancelSubscription}
            className="mt-4 md:mt-0 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Checkout Modal overlay */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Subscribe: {selectedPlan.name}</h3>
              <button 
                onClick={() => setSelectedPlan(null)} 
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                disabled={isProcessingCheckout}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Selected Tier</p>
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5">
                  <span className="font-black text-slate-800">{selectedPlan.name}</span>
                  <span className="font-extrabold text-teal-600 text-sm">
                    ₹{(isAnnual ? (selectedPlan.price * 12) * 0.8 : selectedPlan.price).toLocaleString('en-IN')}/{isAnnual ? 'year' : 'month'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Payment Gateway</label>
                <select
                  value={checkoutGateway}
                  onChange={(e) => setCheckoutGateway(e.target.value)}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="sandbox">Simulated Checkout Sandbox (Instance Verification)</option>
                  <option value="payu">PayU Checkout (Real SaaS Subscription)</option>
                  <option value="stripe">Stripe Online checkout API</option>
                  <option value="razorpay">Razorpay Checkout SDK Gateway</option>
                </select>
              </div>

              {checkoutGateway === 'sandbox' && (
                <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-bold text-teal-800 uppercase flex items-center">
                    <Sparkles className="h-4 w-4 mr-1 text-teal-600" /> Simulated Payment Mode
                  </p>
                  <p className="text-[11px] text-slate-600">Simulates real checkout verification logic. Changes apply immediately upon processing.</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Test Card Number</label>
                      <input 
                        type="text" 
                        value={mockCardNumber} 
                        onChange={(e) => setMockCardNumber(e.target.value)}
                        className="mt-1 block w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Expiry Date</label>
                      <input 
                        type="text" 
                        value={mockCardExpiry} 
                        onChange={(e) => setMockCardExpiry(e.target.value)}
                        className="mt-1 block w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">CVC Code</label>
                      <input 
                        type="text" 
                        value={mockCardCvc} 
                        onChange={(e) => setMockCardCvc(e.target.value)}
                        className="mt-1 block w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  disabled={isProcessingCheckout}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingCheckout}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center justify-center"
                >
                  {isProcessingCheckout ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> Processing...
                    </>
                  ) : (
                    'Confirm Subscription'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSBilling;
