'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { LogIn, UserPlus, Shield, ClipboardCheck, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { subscriptionStatus } = useLicenseStore();
  const [showSplash, setShowSplash] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5);

  // Splash countdown and redirection handler
  useEffect(() => {
    if (!showSplash) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNavigation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showSplash, user, subscriptionStatus]);

  const handleNavigation = () => {
    if (user && (user.registrationStatus === 'activated' || subscriptionStatus === 'active')) {
      router.replace('/dashboard');
    } else {
      setShowSplash(false);
    }
  };

  const handleStart = () => {
    handleNavigation();
  };

  const handleLoginClick = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/google?flow=login`,
          },
        });
        if (error) throw error;
      } catch (err) {
        console.error('Supabase Google Sign-in failed:', err);
        router.push('/auth/google?flow=login');
      }
    } else {
      router.push('/auth/google?flow=login');
    }
  };

  const handleSignUpClick = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/google?flow=signup`,
          },
        });
        if (error) throw error;
      } catch (err) {
        console.error('Supabase Google Sign-up failed:', err);
        router.push('/auth/google?flow=signup');
      }
    } else {
      router.push('/auth/google?flow=signup');
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between bg-background h-full overflow-hidden relative">
      
      {/* ── SPLASH SCREEN OVERLAY ── */}
      {showSplash && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to flex flex-col justify-between px-6 py-12 text-white animate-in fade-in duration-500">
          {/* Animated Background blobs for extra eye-catching effect */}
          <div className="absolute top-10 left-10 w-44 h-44 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse duration-3000" />
          
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
            {/* Pulsing Animated App Logo */}
            <div className="relative animate-bounce duration-1000">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-accent shadow-2xl border border-white/20 transform hover:scale-105 transition-transform">
                <ClipboardCheck className="h-12 w-12 text-gradient-from" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gradient-via shadow-md border-2 border-gradient-from">
                <Shield className="h-4 w-4" />
              </div>
            </div>

            {/* App Name and Description */}
            <div className="space-y-3">
              <h1 className="text-4.5xl font-black tracking-wider text-white drop-shadow-md select-none animate-pulse">
                Snagora
              </h1>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/95 bg-white/15 px-4 py-1.5 rounded-full border border-white/25">
                Offline Inspection & Reporting Tool
              </p>
              <p className="text-xs text-white/80 max-w-xs leading-relaxed pt-2">
                Perform professional building snagging lists completely offline with PDF & Excel compiler cores.
              </p>
            </div>
          </div>

          {/* Bottom Button and Countdown */}
          <div className="space-y-4 w-full">
            <button
              type="button"
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 h-13 rounded-2xl bg-white text-gradient-from hover:bg-slate-50 text-slate-900 font-black text-sm shadow-2xl transition-all transform active:scale-98 cursor-pointer ripple"
            >
              Let's Start <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-[10px] text-white/70 font-medium">
              Entering dashboard automatically in {timeLeft}s...
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN LANDING ACTIONS (REVEALED AFTER SPLASH) ── */}
      {/* Background abstract decoration for premium feel */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-gradient-to/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Landing Content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10 px-6 py-10">
        
        {/* App Logo */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to shadow-xl shadow-accent-glow border-2 border-accent-light/20 text-white">
            <ClipboardCheck className="h-10 w-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-via border-2 border-background shadow-md">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <h1 className="text-3.5xl font-black tracking-tight text-foreground bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to bg-clip-text text-transparent filter drop-shadow-[0_2px_10px_var(--accent-glow)]">
            Snagora
          </h1>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-accent bg-accent-surface px-3 py-1 rounded-full border border-accent-light/30">
            Offline Inspection & Reporting Tool
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mt-4">
            Perform professional building inspections, capture defects, and generate Excel & PDF reports completely offline.
          </p>
        </div>

        {/* Feature Icons Strip */}
        <div className="grid grid-cols-3 gap-6 pt-4 w-full max-w-xs text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-accent">
              ⚡
            </div>
            <span>Offline First</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-accent">
              📸
            </div>
            <span>Annotations</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-accent">
              📄
            </div>
            <span>PDF/Excel</span>
          </div>
        </div>

      </div>

      {/* Action Buttons Block */}
      <div className="space-y-4 w-full z-10 pt-6 px-6 pb-10">
        
        {/* Login Button */}
        <button
          onClick={handleLoginClick}
          className="w-full flex items-center justify-center gap-2 h-13 rounded-2xl bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to hover:opacity-90 text-white font-black text-sm shadow-lg shadow-accent-glow hover:shadow-accent-glow/60 transition-all duration-350 transform active:scale-[0.98] ripple"
        >
          <LogIn className="h-4.5 w-4.5" /> Login
        </button>

        {/* Sign Up Button */}
        <button
          onClick={handleSignUpClick}
          className="w-full flex items-center justify-center gap-2 h-13 rounded-2xl border-2 border-accent/30 bg-surface hover:bg-accent-surface text-accent font-bold text-sm shadow-sm transition-all transform active:scale-[0.98] ripple"
        >
          <UserPlus className="h-4.5 w-4.5" /> Sign Up
        </button>

        {/* Version footer */}
        <p className="text-center text-[9px] text-slate-400 font-mono tracking-wider pt-2">
          v1.0.0 • Secured Offline Core
        </p>

      </div>

    </div>
  );
}
