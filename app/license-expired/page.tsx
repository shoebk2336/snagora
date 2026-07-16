'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, CreditCard, Tag, Mail, ArrowRight } from 'lucide-react';

export default function LicenseExpiredPage() {
  const router = useRouter();

  const handleRenewPayment = () => {
    router.push('/activate');
  };

  const handleViewReports = () => {
    router.push('/reports');
  };

  const handleContactSupport = () => {
    window.open('mailto:support@Snagora.io?subject=License%20Renewal%20Request', '_blank');
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full overflow-hidden relative min-h-0">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Shield Icon */}
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 border border-rose-200 dark:border-rose-900/50 shadow-lg shadow-rose-500/10">
            <ShieldOff className="h-10 w-10" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-foreground text-center">
          License Expired
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2 max-w-xs leading-relaxed">
          Your Snagora subscription has expired. You cannot create new inspections, but your existing reports remain accessible.
        </p>

        {/* What you can still do */}
        <div className="w-full max-w-xs mt-6 p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What you can still do:</h3>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              View existing inspection reports
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Export previously generated reports
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Browse captured photos and annotations
            </p>
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <h4 className="text-[10px] font-semibold text-rose-500 uppercase">Restricted:</h4>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Creating new inspections
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Generating new reports (credits depleted)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-xs mt-6 space-y-3">
          <button
            onClick={handleRenewPayment}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-sm font-semibold shadow-md hover:bg-accent transition-all ripple"
          >
            <CreditCard className="h-4 w-4" /> Renew Subscription
          </button>

          <button
            onClick={handleViewReports}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-border text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            View Existing Reports <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleContactSupport}
            className="w-full flex items-center justify-center gap-2 h-10 text-xs text-accent font-semibold hover:underline"
          >
            <Mail className="h-3.5 w-3.5" /> Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
