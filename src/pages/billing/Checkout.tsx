import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  ArrowLeft, CreditCard, Loader2, AlertCircle, CheckCircle, 
  ShieldCheck, FileText, ShoppingBag, Receipt, DollarSign,
  Smartphone, Globe, QrCode
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  grand_total: number;
  balance_due: number;
  patient_id: string;
  patient_name: string;
  payment_status: string;
}

interface PaymentConfig {
  payu_enabled: boolean;
  payu_merchant_key: string;
  payu_env: string;
  
  razorpay_enabled: boolean;
  razorpay_key_id: string;
  
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  
  upi_enabled: boolean;
  upi_vpa: string;
  upi_merchant_name: string;

  cash_enabled: boolean;
  card_enabled: boolean;
}

export const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [payOption, setPayOption] = useState<'full' | 'partial'>('full');
  
  const [selectedMethod, setSelectedMethod] = useState<'payu' | 'razorpay' | 'stripe' | 'upi'>('payu');
  
  // UPI-specific states
  const [upiLink, setUpiLink] = useState<string>('');
  const [upiUtr, setUpiUtr] = useState<string>('');
  const [showUpiQr, setShowUpiQr] = useState(false);

  // Stripe-specific states - NEVER store raw card data in state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeTokenId, setStripeTokenId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    if (id) {
      loadCheckoutData();
    }
  }, [id]);

  const loadCheckoutData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/payments/checkout-details/${id}`);
      setInvoice(res.data.invoice);
      setConfig(res.data.config);
      setCustomAmount(res.data.invoice.balance_due.toFixed(2));
      
      // Auto-select first active online gateway
      const cfg = res.data.config;
      if (cfg.payu_enabled) setSelectedMethod('payu');
      else if (cfg.razorpay_enabled) setSelectedMethod('razorpay');
      else if (cfg.stripe_enabled) setSelectedMethod('stripe');
      else if (cfg.upi_enabled) setSelectedMethod('upi');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to retrieve invoice checkout parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  const balanceDue = invoice ? invoice.balance_due : 0;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !config) return;

    let payAmount = balanceDue;
    if (payOption === 'partial') {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0 || parsed > balanceDue + 0.01) {
        setError(`Please enter a valid amount between ₹1 and ₹${balanceDue.toFixed(2)}`);
        return;
      }
      payAmount = parsed;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Initialize payment transaction in backend
      const initRes = await apiClient.post('/api/payments/initialize', {
        invoice_id: invoice.id,
        payment_method: selectedMethod,
        amount: payAmount
      });

      const params = initRes.data;

      // 2. Route according to selected gateway flow
      if (selectedMethod === 'payu') {
        // Dynamically create form to post to PayU action URL
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = params.action_url;

        const fields = {
          key: params.key,
          txnid: params.txnid,
          amount: params.amount,
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

      } else if (selectedMethod === 'razorpay') {
        // Load Razorpay SDK and open checkout modal
        const loadScript = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const resLoaded = await loadScript();
        if (!resLoaded) {
          setError('Razorpay SDK failed to load. Are you offline?');
          setIsProcessing(false);
          return;
        }

        const rzpOptions = {
          key: params.key_id,
          amount: Math.round(payAmount * 100), // Razorpay expects paise
          currency: params.currency,
          name: params.name,
          description: params.description,
          order_id: params.razorpay_order_id,
          handler: async (response: any) => {
            try {
              // Verify transaction
              const verifyRes = await apiClient.post('/api/payments/verify', {
                invoice_id: invoice.id,
                payment_method: 'razorpay',
                transaction_id: response.razorpay_payment_id || response.razorpay_order_id || params.razorpay_order_id,
                amount: payAmount,
                extra_data: response
              });
              if (verifyRes.data.status === 'success') {
                navigate(`/payment/success?invoice_id=${invoice.id}&txnid=${params.txnid}`);
              } else {
                navigate(`/payment/failure?invoice_id=${invoice.id}&message=Verification+failed`);
              }
            } catch (err: any) {
              setError(err.response?.data?.detail || 'Signature verification failed.');
            }
          },
          prefill: {
            name: invoice.patient_name,
            email: 'patient@hmis.com'
          },
          theme: {
            color: '#0d9488'
          }
        };

        const paymentObject = new (window as any).Razorpay(rzpOptions);
        paymentObject.open();
        setIsProcessing(false);

      } else if (selectedMethod === 'stripe') {
        // Show mock premium card element modal
        setShowStripeModal(true);
        setIsProcessing(false);

      } else if (selectedMethod === 'upi') {
        // Show dynamic QR code
        setUpiLink(params.upi_link);
        setShowUpiQr(true);
        setIsProcessing(false);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to initialize payment gateway.');
      setIsProcessing(false);
    }
  };

  const handleVerifyStripe = async () => {
    if (!invoice) return;
    setIsProcessing(true);
    setError(null);
    try {
      const mockIntentId = `pi_stripe_${Math.random().toString(36).substr(2, 9)}`;
      const verifyRes = await apiClient.post('/api/payments/verify', {
        invoice_id: invoice.id,
        payment_method: 'stripe',
        transaction_id: mockIntentId,
        amount: payOption === 'full' ? balanceDue : parseFloat(customAmount)
      });

      if (verifyRes.data.status === 'success') {
        setShowStripeModal(false);
        navigate(`/payment/success?invoice_id=${invoice.id}&txnid=${mockIntentId}`);
      } else {
        setError('Card validation authorization failed.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Stripe payment checkout verification failed.');
      setIsProcessing(false);
    }
  };

  const handleVerifyUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !upiUtr.trim()) return;

    setIsProcessing(true);
    setError(null);
    try {
      const verifyRes = await apiClient.post('/api/payments/verify', {
        invoice_id: invoice.id,
        payment_method: 'upi',
        transaction_id: upiUtr.trim(),
        amount: payOption === 'full' ? balanceDue : parseFloat(customAmount)
      });

      if (verifyRes.data.status === 'success') {
        setShowUpiQr(false);
        navigate(`/payment/success?invoice_id=${invoice.id}&txnid=${upiUtr.trim()}`);
      } else {
        setError('Verification rejected by desk logs.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification request failure.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-teal-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Securing Checkout Session...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm text-xs font-semibold text-red-700">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Checkout Session Error</h4>
            <p className="mt-1">{error}</p>
            <button 
              onClick={() => navigate('/patient/portal')}
              className="mt-3 inline-flex items-center text-teal-600 hover:text-teal-800 font-bold underline cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Google Charts dynamic QR Code generator
  const qrCodeUrl = upiLink 
    ? `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(upiLink)}`
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans antialiased text-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/patient/portal')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer border-0 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel Checkout
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Patient Secure Payment Gateway</span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Invoice Summary */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Billed To</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{invoice?.patient_name}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Invoice: {invoice?.invoice_number}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                <p className="text-sm font-black text-slate-900 mt-0.5">₹{invoice?.grand_total.toFixed(2)}</p>
              </div>
            </div>

            {/* Selector: Choose gateway */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Online Payment Gateway</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config?.payu_enabled && (
                  <div 
                    onClick={() => { setSelectedMethod('payu'); setShowUpiQr(false); }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 flex items-center space-x-3 ${
                      selectedMethod === 'payu' ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'
                    }`}
                  >
                    <Globe className={`h-5 w-5 ${selectedMethod === 'payu' ? 'text-teal-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">PayU Checkout</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Credit/Debit Cards, Netbanking</p>
                    </div>
                  </div>
                )}

                {config?.razorpay_enabled && (
                  <div 
                    onClick={() => { setSelectedMethod('razorpay'); setShowUpiQr(false); }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 flex items-center space-x-3 ${
                      selectedMethod === 'razorpay' ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'
                    }`}
                  >
                    <Smartphone className={`h-5 w-5 ${selectedMethod === 'razorpay' ? 'text-teal-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Razorpay Pay</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Instant cards, wallet & UPI modal</p>
                    </div>
                  </div>
                )}

                {config?.stripe_enabled && (
                  <div 
                    onClick={() => { setSelectedMethod('stripe'); setShowUpiQr(false); }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 flex items-center space-x-3 ${
                      selectedMethod === 'stripe' ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'
                    }`}
                  >
                    <CreditCard className={`h-5 w-5 ${selectedMethod === 'stripe' ? 'text-teal-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Stripe Payment</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Global Credit & Debit Card checkout</p>
                    </div>
                  </div>
                )}

                {config?.upi_enabled && (
                  <div 
                    onClick={() => { setSelectedMethod('upi'); }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 flex items-center space-x-3 ${
                      selectedMethod === 'upi' ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'
                    }`}
                  >
                    <QrCode className={`h-5 w-5 ${selectedMethod === 'upi' ? 'text-teal-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Dynamic UPI QR</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Scan via GPay, PhonePe, Paytm</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* UPI QR Display Section */}
            {showUpiQr && upiLink && (
              <div className="border-t border-slate-100 pt-6 flex flex-col items-center text-center space-y-4">
                <p className="text-xs font-bold text-slate-800">Scan QR to Complete Payment</p>
                <div className="p-3 border border-slate-200 bg-white rounded-xl shadow-inner">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="h-44 w-44" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  <p>VPA: {config?.upi_vpa}</p>
                  <p>Merchant: {config?.upi_merchant_name}</p>
                  <p className="mt-1 font-bold text-teal-600">Amount: ₹{payOption === 'full' ? balanceDue.toFixed(2) : parseFloat(customAmount).toFixed(2)}</p>
                </div>

                <form onSubmit={handleVerifyUpi} className="w-full max-w-sm space-y-3 pt-3">
                  <div>
                    <label className="block text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">UPI Ref Number / UTR (12 Digits)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 123456789012"
                      value={upiUtr}
                      onChange={(e) => setUpiUtr(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow cursor-pointer border-0 disabled:opacity-50"
                  >
                    {isProcessing ? 'Verifying payment...' : 'Verify Transfer & Complete'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right: Checkout panel */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <ShoppingBag className="h-4.5 w-4.5 text-teal-600 mr-2" /> Settle Invoice
            </h3>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                <span>Balance Due:</span>
                <span className="font-mono text-rose-600">₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {balanceDue > 0 ? (
              <div className="space-y-4 text-xs font-semibold">
                {/* Options for full vs partial payment */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Structure</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayOption('full');
                        setCustomAmount(balanceDue.toFixed(2));
                      }}
                      className={`py-2 px-3 border rounded text-center cursor-pointer transition-all ${
                        payOption === 'full' 
                          ? 'border-teal-600 bg-teal-50/50 text-teal-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      Pay Full Due
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayOption('partial')}
                      className={`py-2 px-3 border rounded text-center cursor-pointer transition-all ${
                        payOption === 'partial' 
                          ? 'border-teal-600 bg-teal-50/50 text-teal-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      Partial Amount
                    </button>
                  </div>
                </div>

                {payOption === 'partial' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount to Pay (₹)</label>
                    <div className="mt-1 relative rounded shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-mono">₹</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        max={balanceDue}
                        value={customAmount}
                        disabled={showUpiQr}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-3 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                )}

                {!showUpiQr && (
                  <button
                    onClick={handleCheckoutSubmit}
                    disabled={isProcessing}
                    className="w-full inline-flex justify-center items-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 border-0"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                        Initializing Link...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Proceed with Payment
                      </>
                    )}
                  </button>
                )}

                <div className="flex justify-center items-center space-x-1.5 text-[10px] text-slate-400 font-medium">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
                  <span>Secure 256-bit SSL encrypted transaction</span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center text-emerald-800 space-y-2 text-xs">
                <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-bold">This Invoice is Fully Settled</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Stripe Payment Modal mock */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Secure Stripe Checkout</h3>
              <button 
                onClick={() => setShowStripeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Enter test card details to process payment of ₹{payOption === 'full' ? balanceDue.toFixed(2) : parseFloat(customAmount).toFixed(2)}
            </p>

            <div className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CVC / CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyStripe}
                disabled={isProcessing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md border-0 cursor-pointer disabled:opacity-50 flex justify-center items-center"
              >
                {isProcessing ? 'Authorizing transaction...' : `Pay ₹${payOption === 'full' ? balanceDue.toFixed(2) : parseFloat(customAmount).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
