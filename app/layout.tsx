'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { seedDatabase } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { useDraftStore } from '@/store/draftStore';
import { useLicenseStore } from '@/store/licenseStore';
import { checkVersion } from '@/api/licenseApi';
import { getAppVersion } from '@/utils/deviceInfo';
import { isOnline } from '@/api/client';
import BottomNavigation from '@/components/BottomNavigation';
import { Sun, Moon, RotateCcw, Play, CheckCircle, Shield, Coins, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { validateLicense } from '@/api/licenseApi';

function CoinCreditsFetcher() {
  const [isFlipped, setIsFlipped] = useState(false);
  const { reportCreditsRemaining, isUnlimited } = useLicenseStore();
  const displayCount = isUnlimited ? '∞' : reportCreditsRemaining;

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        setIsFlipped(!isFlipped);
      }}
      className="w-8 h-8 cursor-pointer select-none relative hover:scale-105 active:scale-95 transition-transform duration-200"
      style={{ perspective: '1000px' }}
      title={isUnlimited ? "Unlimited report tokens" : `${reportCreditsRemaining} report tokens remaining`}
    >
      {/* Coin Inner Container */}
      <div 
        className="relative w-full h-full duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT: CSS Gold Coin */}
        <div 
          className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-2 border-amber-200/50 shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Inner ring for coin aesthetic */}
          <div className="w-6 h-6 rounded-full border border-amber-100/35 flex items-center justify-center">
            {/* Center golden dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 shadow-inner" />
          </div>
        </div>

        {/* BACK: CSS Gold Coin with Number Overlay */}
        <div 
          className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-2 border-amber-200/50 shadow-md"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Inner ring for coin aesthetic */}
          <div className="w-6 h-6 rounded-full border border-amber-100/35 flex items-center justify-center">
            <span className="text-[10px] font-black text-amber-950 font-mono tracking-tighter drop-shadow-sm select-none">
              {displayCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const { user, login, loadSession, isLoaded: authLoaded } = useAuthStore();
  const { loadDraftFromStorage, activeDraft, discardDraft } = useDraftStore();
  const { loadLicense, isLoaded: licenseLoaded, subscriptionStatus, forceUpdate, updateVersionInfo } = useLicenseStore();
  const [licenseChecked, setLicenseChecked] = useState(false);

  // License gate screens that bypass all checks
  const licenseGateRoutes = ['/auth', '/activate', '/update-required', '/license-expired', '/login', '/'];
  const isGateRoute = licenseGateRoutes.includes(pathname);

  useEffect(() => {
    if (dbReady && licenseChecked && authLoaded) {
      // Skip redirects for gate routes
      if (isGateRoute) return;

      if (!user) {
        router.replace('/');
        return;
      }
      if (user && pathname === '/login') {
        // Check registration status before going to dashboard
        if (user.registrationStatus === 'unregistered' || !user.registrationStatus) {
          router.replace('/auth');
        } else if (user.registrationStatus === 'registered') {
          router.replace('/activate');
        } else if (forceUpdate) {
          router.replace('/update-required');
        } else if (subscriptionStatus === 'expired') {
          router.replace('/license-expired');
        } else {
          router.replace('/dashboard');
        }
        return;
      }
    }
  }, [user, pathname, router, dbReady, licenseChecked, subscriptionStatus, forceUpdate, isGateRoute]);

  useEffect(() => {
    // 1. Seed IndexedDB Database
    const initDb = async () => {
      const timeoutId = setTimeout(() => {
        console.warn('Database initialization timed out. Forcing app to load.');
        setDbReady(true);
      }, 3500);

      try {
        await seedDatabase();
      } catch (e) {
        console.error('IndexedDB seeding failed', e);
      } finally {
        clearTimeout(timeoutId);
        setDbReady(true);
      }
    };
    initDb();

    // 2. Load Auth state securely
    if (typeof window !== 'undefined') {
      const initAuth = async () => {
        try {
          await loadSession();
        } catch (e) {
          console.error('Failed to load secure auth session', e);
        }
      };
      initAuth();

      // 3. Load license from encrypted storage
      const initLicense = async () => {
        try {
          await loadLicense();

          // Optional: check for version updates if online
          if (isOnline()) {
            try {
              const versionInfo = await checkVersion(getAppVersion());
              updateVersionInfo(
                versionInfo.latestVersion,
                versionInfo.minSupportedVersion,
                versionInfo.forceUpdate
              );
            } catch {
              // Version check is non-critical, ignore failures
            }
          }
        } catch (e) {
          console.error('License load failed', e);
        } finally {
          setLicenseChecked(true);
        }
      };
      initLicense();

      // 4. Check for crash drafts
      const draft = loadDraftFromStorage();
      if (draft) {
        setShowRestorePrompt(true);
      }

      // 5. Load theme
      const savedTheme = localStorage.getItem('inspection_theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || 'light';
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [login, loadDraftFromStorage]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('inspection_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleResumeDraft = () => {
    setShowRestorePrompt(false);
    // Redirect to the issue page with draft mode
    if (activeDraft) {
      window.location.href = `/issue?roomId=${activeDraft.roomId}&draftId=${activeDraft.id}`;
    }
  };

  const handleDiscardDraft = async () => {
    await discardDraft();
    setShowRestorePrompt(false);
  };

  if (!dbReady) {
    return (
      <html lang="en" className="h-full" suppressHydrationWarning>
        <body className="flex h-full items-center justify-center bg-slate-900 text-white" suppressHydrationWarning>
          <div className="text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Initializing Database...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <title>Snagora - Offline Inspection & Reporting Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, max-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="description" content="Offline Inspection & Reporting Tool" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center antialiased" suppressHydrationWarning>
        {/* Constrain mobile view in desktop browser */}
        <div className="w-full max-w-md h-dvh bg-background text-foreground shadow-2xl relative flex flex-col pb-16 overflow-hidden">
          
          {/* Global Header */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 z-10 sticky top-0">
            <span className="font-black text-lg tracking-tight flex items-center gap-1.5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-foreground font-black">
                Snag<span style={{ color: '#F5A623' }}>o</span>ra
              </span>
            </span>
            <div className="flex items-center gap-2">
              {user && (
                <CoinCreditsFetcher />
              )}
              <button
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
                title="Toggle theme"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-400" />}
              </button>
            </div>
          </header>

          {/* Page contents slot */}
          <main className="flex-1 flex flex-col overflow-hidden relative min-h-0">
            {isGateRoute || (authLoaded && user) ? (
              children
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                <p className="text-xs text-slate-500 font-medium">Redirecting...</p>
              </div>
            )}
          </main>

          {/* Sticky bottom tabs */}
          <BottomNavigation />

          {/* Unfinished Draft Restoration Prompt Modal */}
          {showRestorePrompt && activeDraft && pathname !== '/issue' && pathname !== '/login' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-accent-surface flex items-center justify-center text-accent">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Unfinished Draft Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    An inspection for <span className="font-semibold text-slate-700 dark:text-slate-200">{activeDraft.title || 'Untitled Issue'}</span> was interrupted. Would you like to resume?
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleResumeDraft}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to text-white text-sm font-semibold hover:opacity-90 shadow-md ripple"
                  >
                    <Play className="h-4 w-4" /> Resume Draft
                  </button>
                  <button
                    onClick={handleDiscardDraft}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    Discard Draft
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </body>
    </html>
  );
}
