'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { activateWithCoupon } from '@/api/licenseApi';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import type { License } from '@/api/mockResponses';
import {
  AlertCircle, Loader2, ArrowLeft, Ticket, Trophy
} from 'lucide-react';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { license, subscriptionStatus, storeLicense } = useLicenseStore();
  const [message, setMessage] = useState('');
  const [assignedCoupon, setAssignedCoupon] = useState<any | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [redeemedCouponDetails, setRedeemedCouponDetails] = useState<any | null>(null);
  const [redeemedCouponCode, setRedeemedCouponCode] = useState<string | null>(null);

  // Check for assigned coupon and last redeemed coupon code on mount/update
  useEffect(() => {
    if (user?.email) {
      if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem('snagora_redeemed_coupon_code');
        if (storedCode) {
          setRedeemedCouponCode(storedCode);
        }
      }

      if (isSupabaseConfigured() && supabase) {
        const fetchCouponsData = async () => {
          try {
            // 1. Fetch assigned coupon (unused)
            const { data: assignedData, error: assignedErr } = await supabase
              .from('coupons')
              .select('*')
              .eq('assigned_to_email', user.email.toLowerCase())
              .eq('is_used', false)
              .limit(1);
            
            if (!assignedErr && assignedData && assignedData.length > 0) {
              setAssignedCoupon(assignedData[0]);
            } else {
              setAssignedCoupon(null);
            }

            // 2. Fetch last redeemed coupon code if not already found in local storage
            const storedCode = localStorage.getItem('snagora_redeemed_coupon_code');
            if (!storedCode) {
              const { data: redeemedData, error: redeemedErr } = await supabase
                .from('coupons')
                .select('code')
                .eq('used_by_email', user.email.toLowerCase())
                .eq('is_used', true)
                .order('used_at', { ascending: false })
                .limit(1);
              
              if (!redeemedErr && redeemedData && redeemedData.length > 0) {
                localStorage.setItem('snagora_redeemed_coupon_code', redeemedData[0].code);
                setRedeemedCouponCode(redeemedData[0].code);
              }
            }
          } catch (err) {
            console.warn('Failed to query coupons data:', err);
          }
        };
        fetchCouponsData();
      }
    }
  }, [user, license]);

  const handleRedeemAssignedCoupon = async () => {
    if (!assignedCoupon) return;
    setRedeeming(true);
    setMessage('');
    try {
      let plan = assignedCoupon.subscription_plan || 'professional';
      let creditsVal = assignedCoupon.report_credits || 100;
      let durationDays = assignedCoupon.duration_days || 365;

      // 1. If Supabase is active, redeem on backend database first
      let updatedCouponResult: any = assignedCoupon;
      if (isSupabaseConfigured() && supabase) {
        const { data: latestCoupon, error: fetchErr } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', assignedCoupon.code.toUpperCase())
          .eq('is_used', false)
          .single();

        if (fetchErr || !latestCoupon) {
          throw new Error('This coupon has already been redeemed or is invalid.');
        }

        // Mark as used
        const { error: updateErr } = await supabase
          .from('coupons')
          .update({
            is_used: true,
            used_by_email: user.email?.toLowerCase(),
            used_at: new Date().toISOString()
          })
          .eq('id', latestCoupon.id);

        if (updateErr) throw updateErr;

        // Credit target user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_balance')
          .eq('id', user.googleIdToken)
          .single();

        const currentBalance = profile?.credits_balance || 0;
        const newBalance = currentBalance + creditsVal;

        await supabase
          .from('profiles')
          .update({ credits_balance: newBalance })
          .eq('id', user.googleIdToken);

        // Fetch verified coupon details
        const { data: verifiedCoupon } = await supabase
          .from('coupons')
          .select('*')
          .eq('id', latestCoupon.id)
          .single();
        
        if (verifiedCoupon) {
          updatedCouponResult = verifiedCoupon;
        }
      } else {
        // Offline / Mock mode fallback
        updatedCouponResult = {
          ...assignedCoupon,
          used_by_email: user.email
        };
      }

      // 2. Generate client license object and apply locally
      const mockLicense: License = {
        customerId: user.customerId || `cust-${Date.now().toString(36)}`,
        companyId: user.companyId || 'personal',
        deviceId: user.deviceId || 'dev-id',
        subscriptionPlan: plan,
        reportCredits: creditsVal,
        unlimitedReports: assignedCoupon.is_unlimited || plan === 'enterprise',
        activationDate: Date.now(),
        expiryDate: Date.now() + durationDays * 24 * 60 * 60 * 1000,
        lastValidationDate: Date.now(),
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
        signature: 'mock-signature',
      };

      await storeLicense(mockLicense);
      if (typeof window !== 'undefined') {
        localStorage.setItem('snagora_redeemed_coupon_code', assignedCoupon.code.toUpperCase());
      }
      
      // Verify coupon ownership matching user email to trigger Congratulations splash
      if (updatedCouponResult && updatedCouponResult.used_by_email?.toLowerCase() === user.email?.toLowerCase()) {
        setRedeemedCouponDetails(updatedCouponResult);
        setShowSuccessDialog(true);
      } else {
        setMessage(`Coupon ${assignedCoupon.code} redeemed successfully!`);
      }
      setAssignedCoupon(null);
    } catch (err: any) {
      setMessage(err.message || 'Failed to redeem coupon.');
    } finally {
      setRedeeming(false);
    }
  };

  if (!user) return null;

  if (showSuccessDialog && redeemedCouponDetails) {
    return (
      <div className="flex flex-1 flex-col bg-background h-full w-full justify-center items-center p-6 text-center space-y-6 animate-in fade-in duration-500">
        {/* Glow behind the icon */}
        <div className="relative my-2">
          <div className="absolute inset-0 rounded-full bg-teal-500/25 blur-xl animate-ping" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white relative z-10 shadow-lg animate-bounce duration-1000">
            <Trophy className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-black text-foreground tracking-wide">Congratulations! 🎉</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            Your coupon code <strong className="font-mono text-teal-650 dark:text-teal-400">{redeemedCouponDetails.code}</strong> was successfully redeemed. 
            Your account has been upgraded with <strong className="text-foreground">{redeemedCouponDetails.is_unlimited ? 'Unlimited' : redeemedCouponDetails.report_credits} Credits</strong> for the next <strong className="text-foreground">{redeemedCouponDetails.duration_days} days</strong>!
          </p>
        </div>

        <button
          onClick={() => {
            setShowSuccessDialog(false);
            setRedeemedCouponDetails(null);
            router.push('/dashboard');
          }}
          className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-xs font-black uppercase tracking-wider shadow-md hover:opacity-95 active:scale-[0.98] transition-all ripple cursor-pointer flex items-center justify-center"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const hasActiveSubscription = license && subscriptionStatus !== 'inactive' && subscriptionStatus !== 'expired';

  return (
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-24 flex flex-col min-h-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">License Manager</span>
            <h2 className="text-base font-bold text-foreground">Subscription Status</h2>
          </div>
        </div>

        {/* Assigned Coupon Alert */}
        {assignedCoupon && (
          <div className="mx-2 p-4 rounded-3xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 text-left animate-in slide-in-from-top-4 duration-300 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                <Ticket className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-teal-850 dark:text-teal-450">Coupon Assigned to You!</h4>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-relaxed">
                  You have a gift coupon code assigned to <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono text-[9px]">{user.email}</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-border/40 text-center">
              <div>
                <span className="text-[8px] text-slate-455 font-bold uppercase block">Code</span>
                <span className="text-xs font-black text-foreground font-mono">{assignedCoupon.code}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-455 font-bold uppercase block">Credits</span>
                <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                  {assignedCoupon.is_unlimited ? '∞' : assignedCoupon.report_credits}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-slate-455 font-bold uppercase block">Validity</span>
                <span className="text-xs font-black text-foreground">{assignedCoupon.duration_days} Days</span>
              </div>
            </div>

            <button
              onClick={handleRedeemAssignedCoupon}
              disabled={redeeming}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 active:scale-[0.98] hover:scale-[1.02] transition-all duration-300 ripple cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 relative overflow-hidden animate-[pulse_3s_infinite]"
            >
              {redeeming ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redeeming...</>
              ) : (
                'Redeem Coupon'
              )}
            </button>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-2xl text-xs font-semibold text-center bg-accent-surface border border-accent-light/30 text-accent">
            {message}
          </div>
        )}

        {hasActiveSubscription && license ? (
          <div className="mx-2 p-5 rounded-3xl bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border border-emerald-500/20 text-left animate-in fade-in duration-300 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Ticket className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block tracking-wider">Verified License</span>
                <h3 className="text-xs font-bold text-foreground">Active Subscription</h3>
              </div>
            </div>

            <div className="space-y-2.5 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Redeemed Coupon</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-black text-foreground text-right">
                  {redeemedCouponCode || 'SNAGORA-ACTIVE'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Validity Period</span>
                <span className="font-semibold text-foreground text-right">
                  Expires {new Date(license.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Report Credits</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                  {license.unlimitedReports ? 'Unlimited' : license.reportCredits} Credits
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Report Generation</span>
                <span className="font-semibold text-foreground text-right">
                  {license.unlimitedReports ? 'Unlimited Reports' : `${Math.floor(license.reportCredits / 5)} Reports`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* No Active Subscription State */
          <div className="flex-1 flex flex-col justify-between pt-2">
            {/* Banner showing no subscription */}
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">No Active Subscription</h4>
                <p className="text-[11px] text-amber-700/80 dark:text-slate-350 leading-relaxed">
                  You currently do not have an active subscription or trial license. Report exports, offline syncing, and team collaboration features are disabled. Please purchase or activate a license to unlock full features.
                </p>
              </div>
            </div>

            {/* Button at the bottom */}
            <div className="pb-4">
              <button
                type="button"
                onClick={() => router.push('/activate')}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 active:scale-[0.98] transition-all ripple cursor-pointer flex items-center justify-center gap-2"
              >
                Go to Purchase Mode
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
