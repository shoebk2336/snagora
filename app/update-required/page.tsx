'use client';

import React from 'react';
import { AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { useLicenseStore } from '@/store/licenseStore';
import { getAppVersion } from '@/utils/deviceInfo';

export default function UpdateRequiredPage() {
  const { latestVersion, minSupportedVersion, forceUpdate } = useLicenseStore();
  const currentVersion = getAppVersion();

  const handleUpdate = () => {
    // In production, link to app store or APK download
    window.open('https://Snagora.io/download/latest.apk', '_blank');
  };

  const handleSkip = () => {
    // Optional update — allow continuing
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full overflow-hidden relative min-h-0">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Warning Icon */}
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 border border-amber-200 dark:border-amber-900/50 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center">
            <span className="text-[9px] font-black text-white">!</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-foreground text-center">
          {forceUpdate ? 'Update Required' : 'Update Available'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2 max-w-xs leading-relaxed">
          {forceUpdate
            ? 'A newer version of Snagora is required to continue. Your current version is no longer supported.'
            : 'A newer version of Snagora is available with improvements and bug fixes.'}
        </p>

        {/* Version Info Card */}
        <div className="w-full max-w-xs mt-6 p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Current Version</span>
            <span className="font-mono font-bold text-foreground">{currentVersion}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Latest Version</span>
            <span className="font-mono font-bold text-accent">{latestVersion}</span>
          </div>
          {forceUpdate && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Minimum Required</span>
              <span className="font-mono font-bold text-rose-500">{minSupportedVersion}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="w-full max-w-xs mt-6 space-y-3">
          <button
            onClick={handleUpdate}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-sm font-semibold shadow-md hover:bg-accent transition-all ripple"
          >
            <Download className="h-4 w-4" /> Download Update
          </button>

          {!forceUpdate && (
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-border text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Skip for Now <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
