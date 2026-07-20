'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { activateWithCoupon } from '@/api/licenseApi';
import type { License } from '@/api/mockResponses';
import {
  CreditCard, Tag, Loader2, CheckCircle, Shield,
  AlertCircle, ArrowRight, Sparkles, Mail, Info, ExternalLink
} from 'lucide-react';

type ActivationMethod = 'choose' | 'coupon' | 'paypal' | 'sales';

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 bg-background h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">Loading activation options...</p>
      </div>
    }>
      <ActivateContent />
    </Suspense>
  );
}

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setActivated } = useAuthStore();
  const { storeLicense } = useLicenseStore();

  const initialMethod = (searchParams.get('method') as ActivationMethod) || 'choose';
  const [method, setMethod] = useState<ActivationMethod>(initialMethod);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Contact Sales form states
  const [salesName, setSalesName] = useState(user?.name || '');
  const [salesEmail, setSalesEmail] = useState(user?.email || '');
  const [salesMessage, setSalesMessage] = useState('Hello, I would like to request an enterprise activation for Snagora.');

  if (!user) return null;

  // Option 1: Coupon Activation (Must be alphanumeric)
  const handleCouponActivation = async () => {
    setError('');
    setSuccess('');

    if (!couponCode.trim()) {
      setError('Please enter a coupon code.');
      return;
    }

    // Alphanumeric regex check
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(couponCode.trim());
    if (!isAlphanumeric) {
      setError('Coupon code must be alphanumeric (letters and numbers only).');
      return;
    }

    setLoading(true);
    try {
      const result = await activateWithCoupon(
        user.customerId || '',
        user.companyId || '',
        user.deviceId || '',
        couponCode.trim()
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      await storeLicense(result.license);
      if (typeof window !== 'undefined') {
        localStorage.setItem('snagora_redeemed_coupon_code', couponCode.trim().toUpperCase());
      }
      await setActivated();
      setSuccess(result.message);

      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (e) {
      setError('Coupon activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Option 2: PayPal Payment (Simulated)
  const handlePaypalPayment = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Simulate PayPal transaction network time
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockLicense: License = {
        customerId: user.customerId || `cust-${Date.now().toString(36)}`,
        companyId: user.companyId || `comp-${Date.now().toString(36)}`,
        deviceId: user.deviceId || 'dev-id',
        subscriptionPlan: 'professional',
        reportCredits: 100,
        unlimitedReports: false,
        activationDate: Date.now(),
        expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        lastValidationDate: Date.now(),
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
        signature: 'mock-signature',
      };

      await storeLicense(mockLicense);
      await setActivated();
      setSuccess('PayPal payment completed! 1-Year Professional subscription activated.');

      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (e) {
      setError('PayPal transaction verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Option 3: Contact Admin (Send inquiry to Supabase)
  const handleContactSales = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!salesMessage.trim()) {
      setError('Please enter a message.');
      return;
    }

    setLoading(true);
    try {
      // Send inquiry email via API route
      const res = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: salesName,
          email: user.email || '',
          message: salesMessage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to send inquiry:', errData);
        setError('Failed to send inquiry. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('Inquiry sent to support team! A 14-day starter license has been activated.');

      // Assign review trial license so they can explore the app in the meantime
      const mockLicense: License = {
        customerId: user.customerId || `cust-${Date.now().toString(36)}`,
        companyId: user.companyId || `comp-${Date.now().toString(36)}`,
        deviceId: user.deviceId || 'dev-id',
        subscriptionPlan: 'starter',
        reportCredits: 25,
        unlimitedReports: false,
        activationDate: Date.now(),
        expiryDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days review
        lastValidationDate: Date.now(),
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
        signature: 'mock-signature',
      };

      await storeLicense(mockLicense);
      await setActivated();

      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError('Failed to send inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Option 4: Skip Screen (Assigns 7 days trial license)
  const handleSkip = async () => {
    setLoading(true);
    try {
      const mockLicense: License = {
        customerId: user.customerId || `cust-${Date.now().toString(36)}`,
        companyId: user.companyId || `comp-${Date.now().toString(36)}`,
        deviceId: user.deviceId || 'dev-id',
        subscriptionPlan: 'starter',
        reportCredits: 25,
        unlimitedReports: false,
        activationDate: Date.now(),
        expiryDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days trial
        lastValidationDate: Date.now(),
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
        signature: 'mock-signature',
      };

      await storeLicense(mockLicense);
      await setActivated();
      router.push('/dashboard');
    } catch (e) {
      setError('Failed to skip activation.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 flex flex-col justify-between min-h-0">

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gradient-from to-gradient-to shadow-lg shadow-accent-glow text-white mb-4">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-foreground">Welcome to Snagora</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose an option to activate your device subscription
            </p>
          </div>

          {/* ── METHOD CHOOSER ── */}
          {method === 'choose' && (
            <div className="space-y-4">
              {/* Option 1: Coupon Code */}
              <button
                onClick={() => setMethod('coupon')}
                className="w-full p-4 rounded-3xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-left shadow-sm transition-all group ripple"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/20 text-violet-500 group-hover:scale-105 transition-transform">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Coupon Code</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Use an alpha-numeric coupon code provided by your business admin
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-accent transition-colors" />
                </div>
              </button>

              {/* Option 2: PayPal Card */}
              <button
                onClick={() => setMethod('paypal')}
                className="w-full p-4 rounded-3xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-left shadow-sm transition-all group ripple"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 group-hover:scale-105 transition-transform">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">PayPal Checkout</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Secure checkout using your PayPal account for personal plans
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-accent transition-colors" />
                </div>
              </button>



              {/* Demo Hint */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/40 border border-border flex gap-2.5 text-[10px] text-slate-500 dark:text-slate-400">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-accent" />
                <div>
                  <span className="font-bold">Test Codes:</span> Try alphanumeric coupon codes <span className="font-mono font-bold bg-slate-200 dark:bg-slate-700 px-1 rounded text-foreground">DEMO</span> or <span className="font-mono font-bold bg-slate-200 dark:bg-slate-700 px-1 rounded text-foreground">ENTERPRISE</span>.
                </div>
              </div>
            </div>
          )}

          {/* ── COUPON CODE FORM ── */}
          {method === 'coupon' && (
            <div className="space-y-4">
              <button
                onClick={() => { setMethod('choose'); setError(''); setSuccess(''); }}
                className="text-xs text-accent font-semibold self-start"
              >
                ← Back to options
              </button>

              <div className="p-5 rounded-3xl border border-border bg-surface shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-500">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Activate with Coupon</h3>
                    <p className="text-[10px] text-slate-400">Enter your alphanumeric activation code</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Coupon Code</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ENTERPRISE123"
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-sm font-mono font-bold text-foreground placeholder-slate-400 focus:border-accent focus:outline-none tracking-widest text-center uppercase"
                  />
                </div>

                <button
                  onClick={handleCouponActivation}
                  disabled={loading || !couponCode.trim()}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-violet-600 text-white text-sm font-semibold shadow hover:bg-violet-500 disabled:opacity-50 transition-all ripple"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...</>
                  ) : (
                    <><Shield className="h-4 w-4" /> Activate License</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── PAYPAL CHECKOUT PAGE ── */}
          {method === 'paypal' && (
            <div className="space-y-4">
              <button
                onClick={() => { setMethod('choose'); setError(''); setSuccess(''); }}
                className="text-xs text-accent font-semibold self-start"
              >
                ← Back to options
              </button>

              <div className="p-5 rounded-3xl border border-border bg-surface shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">PayPal Payment</h3>
                    <p className="text-[10px] text-slate-400">Complete professional subscription checkout</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-center">
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase block">Professional Plan</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">$49<span className="text-xs font-normal"> / year</span></span>
                  <span className="text-[10px] text-slate-500 block mt-1">Unlimited offline reports & photo annotations</span>
                </div>

                {/* Simulated PayPal Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handlePaypalPayment}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-full bg-[#FFC439] hover:bg-[#F2BA30] text-[#111] text-xs font-black shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-800" />
                    ) : (
                      <>
                        <span className="italic font-bold text-blue-900">Pay</span>
                        <span className="italic font-bold text-sky-500">Pal</span>
                        <span>Checkout</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePaypalPayment}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-full bg-[#2C2E2F] hover:bg-[#202223] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    Debit or Credit Card
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTACT SALES GMAIL FORM ── */}
          {method === 'sales' && (
            <div className="space-y-4">
              <button
                onClick={() => { router.push('/settings'); setError(''); setSuccess(''); }}
                className="text-xs text-accent font-semibold self-start"
              >
                ← Back to Settings
              </button>

              <form onSubmit={handleContactSales} className="p-5 rounded-3xl border border-border bg-surface shadow-sm space-y-3.5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-surface text-accent">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Send Inquiry</h3>
                    <p className="text-[10px] text-slate-400">Submit an inquiry to request license activation</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={salesName}
                    onChange={e => setSalesName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={salesMessage}
                    onChange={e => setSalesMessage(e.target.value)}
                    placeholder="How many licenses do you need?"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50 transition-all ripple"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending Inquiry...</>
                  ) : (
                    <>Send Inquiry <ExternalLink className="h-3.5 w-3.5" /></>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 font-semibold text-center flex items-center justify-center gap-1.5 animate-shake">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-2xl bg-accent-surface border border-accent-light/30 text-xs text-accent font-semibold text-center flex items-center justify-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 flex-shrink-0 text-accent animate-bounce" /> {success}
            </div>
          )}
        </div>

        {/* ── SKIP BUTTON & FOOTER ── */}
        {method === 'choose' && (
          <div className="pt-8 text-center space-y-4 z-10">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-xs font-bold text-slate-500 hover:text-accent transition-colors uppercase tracking-wider underline underline-offset-4"
            >
              Skip Activation for now
            </button>
            <p className="text-[9px] text-slate-400">
              Skipping activates a 7-day trial of Starter plan features.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
