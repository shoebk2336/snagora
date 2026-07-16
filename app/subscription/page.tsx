'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore, getDaysUntilExpiry, getDaysSinceValidation } from '@/store/licenseStore';
import { validateLicense, renewSubscription } from '@/api/licenseApi';
import {
  Shield, Clock, FileText, RefreshCw, CheckCircle,
  AlertCircle, Loader2, Crown, ArrowLeft, Zap
} from 'lucide-react';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { license, subscriptionStatus, reportCreditsRemaining, isUnlimited, storeLicense } = useLicenseStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user || !license) return null;

  const daysLeft = getDaysUntilExpiry();
  const daysSinceVal = getDaysSinceValidation();
  const expiryPercent = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

  const planColors: Record<string, string> = {
    starter: 'from-blue-500 to-cyan-500',
    professional: 'from-gradient-from to-violet-500',
    enterprise: 'from-amber-500 to-orange-500',
  };

  const handleValidateNow = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await validateLicense(user.deviceId || '', user.customerId || '');
      if (result.success) {
        await storeLicense(result.license);
        setMessage('License validated successfully!');
      } else {
        setMessage('Validation failed. Please try again later.');
      }
    } catch {
      setMessage('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await renewSubscription(
        user.customerId || '',
        user.companyId || '',
        user.deviceId || ''
      );
      if (result.success) {
        await storeLicense(result.license);
        setMessage('Subscription renewed successfully!');
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage('Renewal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-24 min-h-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">License Manager</span>
            <h2 className="text-base font-bold text-foreground">Subscription Status</h2>
          </div>
        </div>

        {/* Plan Card */}
        <div className={`p-5 rounded-3xl bg-gradient-to-br ${planColors[license.subscriptionPlan] || planColors.professional} text-white shadow-lg relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-6 -translate-x-6" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Active Plan</span>
            </div>
            <h3 className="text-xl font-black capitalize">{license.subscriptionPlan} Plan</h3>
            <p className="text-xs opacity-80 mt-1">{user.company || 'Personal'}</p>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-3xl font-black">{daysLeft}</span>
                <span className="text-xs ml-1 opacity-80">days left</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                subscriptionStatus === 'active'
                  ? 'bg-white/25'
                  : subscriptionStatus === 'expired'
                  ? 'bg-rose-500/80'
                  : 'bg-amber-500/80'
              }`}>
                {subscriptionStatus === 'active' ? '● Active' :
                 subscriptionStatus === 'expired' ? '● Expired' : '● Needs Validation'}
              </div>
            </div>

            {/* Expiry Progress Bar */}
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{ width: `${expiryPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
              <FileText className="h-3.5 w-3.5 text-accent" /> Report Credits
            </div>
            <span className="text-lg font-black text-foreground">
              {isUnlimited ? '∞' : reportCreditsRemaining}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {isUnlimited ? 'Unlimited plan' : 'credits remaining'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
              <Clock className="h-3.5 w-3.5 text-accent" /> Last Validated
            </div>
            <span className="text-lg font-black text-foreground">{daysSinceVal}d</span>
            <span className="text-[10px] text-slate-400 block">
              {daysSinceVal >= 28 ? 'Validation overdue!' : `Next in ${28 - daysSinceVal}d`}
            </span>
          </div>
        </div>

        {/* Details List */}
        <div className="p-4 rounded-3xl border border-border bg-surface shadow-sm space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">License Details</h3>

          {[
            ['Activation Date', new Date(license.activationDate).toLocaleDateString()],
            ['Expiry Date', new Date(license.expiryDate).toLocaleDateString()],
            ['Customer ID', license.customerId],
            ['Device ID', license.deviceId.slice(0, 20) + '...'],
            ['App Version', license.latestVersion],
            ['Min Version', license.minSupportedVersion],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleValidateNow}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-sm font-semibold shadow hover:bg-accent disabled:opacity-50 transition-all ripple"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Validate License Now</>
            )}
          </button>

          {daysLeft <= 7 && (
            <button
              onClick={handleRenew}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-accent-light/30 text-accent text-sm font-semibold hover:bg-accent-surface disabled:opacity-50 ripple"
            >
              <Zap className="h-4 w-4" /> Renew Subscription
            </button>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-2xl text-xs font-semibold text-center ${
            message.includes('success')
              ? 'bg-accent-surface border border-accent-light/30 text-accent'
              : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-600'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
