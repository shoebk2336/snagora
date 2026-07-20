'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase, isSupabaseConfigured, getOauthRedirectUrl } from '@/utils/supabase';
import {
  Shield, Mail, Phone, User, ArrowLeft,
  Loader2, BadgeHelp, Building, AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();



  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [designation, setDesignation] = useState('');

  // UI Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    router.push('/');
  };

  const handleFinalizeClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Full Name is the ONLY compulsory field
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter a valid Full Name (minimum 2 characters).');
      return;
    }

    setLoading(true);

    // Save temporary details to localStorage (safer for redirect persistence across domains)
    localStorage.setItem(
      'temp_signup_form',
      JSON.stringify({ fullName, email, mobile, age, designation })
    );

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getOauthRedirectUrl('/auth/google?flow=signup'),
          },
        });
        if (authError) throw authError;
      } catch (err: any) {
        setError(err.message || 'Supabase Google Auth failed.');
        setLoading(false);
      }
    } else {
      // Redirect to the professional Google Accounts selection page (mock fallback)
      router.push('/auth/google?flow=signup');
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full overflow-hidden relative min-h-0">
      
      {/* Background abstract decoration */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Back Button */}
      <div className="px-5 pt-5 pb-2 flex items-center gap-3 z-10">
        <button 
          onClick={handleBack}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50"
          title="Back to Welcome Screen"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Account Creation</span>
          <h2 className="text-sm font-black text-foreground">Registration</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-10 flex flex-col justify-between min-h-0 z-10">
        
        {/* Registration Form */}
        <form onSubmit={handleFinalizeClick} className="space-y-4 pt-4">
          
          {/* Header Card */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-850/40 border border-border text-center space-y-1 mb-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-surface text-accent">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Sign Up</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Only Full Name is required. Google sign-in will finalize the creation.
            </p>
          </div>

          {/* Error Message banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium text-left">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name - COMPULSORY */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-accent" /> Full Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
            />
          </div>

          {/* Email Address - OPTIONAL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
            />
          </div>

          {/* Mobile Number - OPTIONAL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> Mobile Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
            />
          </div>

          {/* Optional Fields Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Age - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-750 dark:text-slate-300 flex items-center gap-1.5">
                <BadgeHelp className="h-3.5 w-3.5 text-slate-400" /> Age <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 28"
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
              />
            </div>

            {/* Designation - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-755 dark:text-slate-300 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" /> Designation <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                placeholder="e.g. QA Lead"
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Trigger Block */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 h-13 rounded-2xl bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to text-white text-sm font-black shadow-lg shadow-accent-glow hover:shadow-emerald-500/40 disabled:opacity-60 transition-all ripple"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                  Finalizing Signup...
                </>
              ) : (
                'Finalize Signup with Google'
              )}
            </button>
          </div>

        </form>

        {/* Offline Badge footer */}
        <div className="text-center mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-surface px-3 py-1 text-xs font-semibold text-accent border border-accent-light/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            Device Registration Secured
          </span>
        </div>

      </div>
    </div>
  );
}
