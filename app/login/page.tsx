'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured, getOauthRedirectUrl } from '@/utils/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleClick = async () => {
    if (loading) return; // Disable multiple taps
    setError('');
    setLoading(true);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getOauthRedirectUrl('/auth/google?flow=login'),
          },
        });
        if (authError) throw authError;
      } catch (err: any) {
        setError(err.message || 'Supabase Google Auth failed.');
        setLoading(false);
      }
    } else {
      // Redirect to the professional Google Accounts selection page for login flow (mock fallback)
      router.push('/auth/google?flow=login');
    }
  };

  useEffect(() => {
    handleGoogleClick();
  }, []);


  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="flex flex-1 flex-col bg-background px-6 py-8 h-full overflow-hidden relative">
      
      {/* Background abstract decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Back Button */}
      <div className="z-10 flex items-center mb-10">
        <button 
          onClick={handleBack}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50"
          title="Back to Welcome Screen"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Login Screen Main Card Context */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10">
        
        {/* Animated App Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to shadow-lg shadow-accent-glow text-white">
          <ShieldCheck className="h-8 w-8" />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mx-auto">
            Sign in to access your offline snag lists, defects register, and local databases.
          </p>
        </div>

        {/* Error Message banner */}
        {error && (
          <div className="w-full max-w-xs p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium text-left">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Action */}
        <div className="w-full max-w-xs pt-4">
          <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-13 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-surface text-foreground font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 transition-all disabled:opacity-60 disabled:cursor-not-allowed ripple"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin text-accent" />
                Connecting Google...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

      </div>

      {/* Footer Info */}
      <div className="z-10 mt-auto text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-surface px-3 py-1 text-xs font-semibold text-accent border border-accent-light/30">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          Offline Sync Enabled (IndexedDB)
        </span>
      </div>

    </div>
  );
}
