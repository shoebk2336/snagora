'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { collectDeviceInfo } from '@/utils/deviceInfo';
import { Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

export default function GoogleSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const setRegistration = useAuthStore((state) => state.setRegistration);

  const flow = searchParams.get('flow') || 'login'; // 'login' or 'signup'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom styling for google page to look exactly like accounts.google.com
  useEffect(() => {
    // Force light theme styling on the body for Google Sign-in to mimic authentic look
    document.documentElement.classList.add('google-auth-active');
    return () => {
      document.documentElement.classList.remove('google-auth-active');
    };
  }, []);

  // Supabase Auth Session listener and processor
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      return; // Fallback to developer mock list
    }

    const client = supabase;

    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          await handleSupabaseAuthSuccess(session);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to retrieve Supabase session on load:', err);
        setError(err.message || 'Supabase authentication failed.');
        setLoading(false);
      }
    };

    checkSession();

    // Listen to changes (e.g. after OAuth redirect callback finishes hashing credentials)
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        await handleSupabaseAuthSuccess(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [flow]);

  const handleSupabaseAuthSuccess = async (session: any) => {
    const sUser = session.user;
    const email = sUser.email;
    const mockIdToken = session.access_token || sUser.id;
    const googleName = sUser.user_metadata?.full_name || sUser.user_metadata?.name || email?.split('@')[0] || 'User';
    const picture = sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${googleName.replace(/\s+/g, '')}`;

    const googleProfile = {
      googleIdToken: mockIdToken,
      email: email || '',
      name: googleName,
      picture,
      authenticatedAt: new Date().toISOString()
    };

    try {
      if (flow === 'signup') {
        const storedForm = localStorage.getItem('temp_signup_form');
        let formData = {
          fullName: googleName,
          email: email,
          mobile: 'Not Provided',
          age: '',
          designation: ''
        };

        if (storedForm) {
          try {
            const parsed = JSON.parse(storedForm);
            formData = { ...formData, ...parsed };
          } catch {}
        }

        const deviceInfo = collectDeviceInfo();

        // 1. Set login session
        await login(formData.fullName || googleName, 'Inspector', mockIdToken, googleProfile);

        // 2. Save registration data
        await setRegistration({
          email: formData.email || email,
          company: formData.designation || 'Independent',
          mobile: formData.mobile || 'Not Provided',
          customerId: `cust-${Date.now().toString(36)}`,
          companyId: `comp-${Date.now().toString(36)}`,
          deviceId: deviceInfo.deviceId,
          age: formData.age ? parseInt(formData.age, 10) : undefined,
          designation: formData.designation || undefined,
        });

        // 3. Inject raw Google payload in JSON format for db reference later
        const storedUser = localStorage.getItem('inspection_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.googleProfile = googleProfile;
            localStorage.setItem('inspection_user', JSON.stringify(parsed));
          } catch {}
        }

        localStorage.removeItem('temp_signup_form');
        router.push('/activate');
      } else {
        // Login Flow
        await login(googleName, 'Inspector', mockIdToken, googleProfile);
        
        // Sync googleProfile on login
        const storedUser = localStorage.getItem('inspection_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.googleProfile = googleProfile;
            localStorage.setItem('inspection_user', JSON.stringify(parsed));
          } catch {}
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error post-processing Supabase sign-in:', err);
      setError(err.message || 'Error processing account data.');
      setLoading(false);
    }
  };

  const handleSelectAccount = async (email: string, name: string) => {
    setLoading(true);
    setError('');

    try {
      // Simulate OAuth network latency and credential generation
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const mockIdToken = `google_oauth_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const picture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`;
      const googleProfile = {
        googleIdToken: mockIdToken,
        email: email,
        name: name,
        picture,
        authenticatedAt: new Date().toISOString()
      };
      
      if (flow === 'signup') {
        const storedForm = localStorage.getItem('temp_signup_form');
        let formData = {
          fullName: name,
          email: email,
          mobile: 'Not Provided',
          age: '',
          designation: ''
        };

        if (storedForm) {
          try {
            const parsed = JSON.parse(storedForm);
            formData = { ...formData, ...parsed };
          } catch {}
        }

        const deviceInfo = collectDeviceInfo();

        // 1. Set login session
        await login(formData.fullName || name, 'Inspector', mockIdToken, googleProfile);

        // 2. Save registration data
        await setRegistration({
          email: formData.email || email,
          company: formData.designation || 'Independent',
          mobile: formData.mobile || 'Not Provided',
          customerId: `cust-${Date.now().toString(36)}`,
          companyId: `comp-${Date.now().toString(36)}`,
          deviceId: deviceInfo.deviceId,
          age: formData.age ? parseInt(formData.age, 10) : undefined,
          designation: formData.designation || undefined,
        });

        // 3. Inject raw Google payload in JSON format for db reference later
        const storedUser = localStorage.getItem('inspection_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.googleProfile = googleProfile;
            localStorage.setItem('inspection_user', JSON.stringify(parsed));
          } catch {}
        }

        localStorage.removeItem('temp_signup_form');
        router.push('/activate');
      } else {
        // Login Flow
        await login(name, 'Inspector', mockIdToken, googleProfile);

        // Sync googleProfile on login for mock fallback
        const storedUser = localStorage.getItem('inspection_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.googleProfile = googleProfile;
            localStorage.setItem('inspection_user', JSON.stringify(parsed));
          } catch {}
        }

        router.push('/dashboard');
      }
    } catch (err) {
      setLoading(false);
      setError('Internal Google Authentication error.');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (!customName.trim()) {
      setError('Enter your name');
      return;
    }
    handleSelectAccount(customEmail.trim(), customName.trim());
  };

  const handleCancel = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    if (flow === 'signup') {
      router.push('/auth');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans px-4 py-8">
      
      {/* Container Box */}
      <div className="w-full max-w-[450px] bg-white rounded-lg border border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[500px]">
        
        <div className="space-y-6">
          {/* Authentic Google Multi-color Logo */}
          <div className="flex justify-start">
            <svg className="h-6 w-auto" viewBox="0 0 74 24" fill="none">
              <path d="M7.747 13.914v-3.155H14.73c.094.49.141.979.141 1.488 0 1.94-.48 3.738-1.44 5.396-.96 1.657-2.316 2.92-4.068 3.788-1.753.867-3.69 1.3-5.815 1.3C1.528 22.73 0 21.218 0 13.965V8.766C0 1.513 1.528 0 3.548 0c2.124 0 4.061.433 5.814 1.3 1.753.867 3.109 2.13 4.069 3.788.96 1.657 1.44 3.456 1.44 5.396 0 .509-.047.998-.14 1.488v1.942H7.747z" fill="#4285F4"/>
              <path d="M22.096 11.238c0 1.846-.43 3.437-1.29 4.774-.86 1.336-2.029 2.348-3.506 3.036-1.477.688-3.087 1.032-4.83 1.032-1.744 0-3.354-.344-4.83-1.032-1.478-.688-2.646-1.7-3.506-3.036-.86-1.337-1.29-2.928-1.29-4.774 0-1.846.43-3.437 1.29-4.774.86-1.336 2.028-2.348 3.506-3.036 1.476-.688 3.086-1.032 4.83-1.032 1.743 0 3.353.344 4.83 1.032 1.477.688 2.646 1.7 3.506 3.036.86 1.337 1.29 2.928 1.29 4.774zm-4.321 0c0-1.233-.243-2.274-.73-3.123-.487-.849-1.166-1.503-2.036-1.962-.87-.46-1.826-.689-2.868-.689-1.042 0-1.997.23-2.868.69-.87.458-1.55.112-2.036 1.961-.487.85-.73 1.89-.73 3.123 0 1.233.243 2.274.73 3.123.487.849 1.166 1.503 2.036 1.962.87.46 1.826.689 2.868.689 1.042 0 1.997-.23 2.868-.69.87-.458 1.55-.112 2.036-1.961.487-.85.73-1.89.73-3.123z" fill="#EA4335"/>
              <path d="M37.387 11.238c0 1.846-.43 3.437-1.29 4.774-.86 1.336-2.028 2.348-3.506 3.036-1.477.688-3.087 1.032-4.83 1.032-1.743 0-3.353-.344-4.83-1.032-1.477-.688-2.646-1.7-3.506-3.036-.86-1.337-1.29-2.928-1.29-4.774 0-1.846.43-3.437 1.29-4.774.86-1.336 2.029-2.348 3.506-3.036 1.477-.688 3.087-1.032 4.83-1.032 1.743 0 3.353.344 4.83 1.032 1.478.688 2.646 1.7 3.506 3.036.86 1.337 1.29 2.928 1.29 4.774zm-4.321 0c0-1.233-.243-2.274-.73-3.123-.487-.849-1.166-1.503-2.036-1.962-.87-.46-1.826-.689-2.868-.689-1.042 0-1.998.23-2.868.69-.87.458-1.55.112-2.036 1.961-.487.85-.73 1.89-.73 3.123 0 1.233.243 2.274.73 3.123.487.849 1.166 1.503 2.036 1.962.87.46 1.826.689 2.868.689 1.042 0 1.998-.23 2.868-.69.87-.458 1.55-.112 2.036-1.961.487-.85.73-1.89.73-3.123z" fill="#FBBC05"/>
              <path d="M52.678 11.238c0 1.846-.43 3.437-1.29 4.774-.86 1.336-2.028 2.348-3.506 3.036-1.477.688-3.087 1.032-4.83 1.032-1.743 0-3.353-.344-4.83-1.032-1.477-.688-2.646-1.7-3.506-3.036-.86-1.337-1.29-2.928-1.29-4.774 0-1.846.43-3.437 1.29-4.774.86-1.336 2.029-2.348 3.506-3.036 1.477-.688 3.087-1.032 4.83-1.032 1.743 0 3.353.344 4.83 1.032 1.478.688 2.646 1.7 3.506 3.036.86 1.337 1.29 2.928 1.29 4.774zm-4.321 0c0-1.233-.243-2.274-.73-3.123-.487-.849-1.166-1.503-2.036-1.962-.87-.46-1.826-.689-2.868-.689-1.042 0-1.998.23-2.868.69-.87.458-1.55.112-2.036 1.961-.487.85-.73 1.89-.73 3.123 0 1.233.243 2.274.73 3.123.487.849 1.166 1.503 2.036 1.962.87.46 1.826.689 2.868.689 1.042 0 1.998-.23 2.868-.69.87-.458-1.55-.112 2.036-1.961.487-.85.73-1.89.73-3.123z" fill="#34A853"/>
              <path d="M67.97 10.965v11.765H63.65v-3.036c-.43.518-1.077 1.072-1.942 1.662-.865.59-1.898 1.053-3.098 1.389-1.2.336-2.453.504-3.76.504-1.986 0-3.767-.384-5.342-1.152-1.575-.768-2.837-1.846-3.786-3.234s-1.423-3.023-1.423-4.908c0-1.884.474-3.52 1.423-4.908s2.211-2.466 3.786-3.234c1.575-.768 3.356-1.152 5.342-1.152 1.307 0 2.56.168 3.76.504 1.2.336 2.233.802 3.098 1.398.865.596 1.512 1.144 1.942 1.644v-3.146H67.97zm-4.32 0c0-1.233-.243-2.274-.73-3.123-.487-.849-1.166-1.503-2.036-1.962-.87-.46-1.826-.689-2.868-.689-1.042 0-1.998.23-2.868.69-.87.458-1.55.112-2.036 1.961-.487.85-.73 1.89-.73 3.123 0 1.233.243 2.274.73 3.123.487.849 1.166 1.503 2.036 1.962.87.46 1.826.689 2.868.689 1.042 0 1.998-.23 2.868-.69.87-.458 1.55-.112 2.036-1.961.487-.85.73-1.89.73-3.123z" fill="#4285F4"/>
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-slate-900 leading-tight">
              {showCustomForm ? 'Sign in with a new account' : 'Choose an account'}
            </h1>
            <p className="text-sm text-slate-600">
              to continue to <span className="font-semibold text-accent">Snagora</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          {isSupabaseConfigured() ? (
            loading || !error ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#4285F4]" />
                <span className="text-xs text-slate-500 font-medium">Completing Google authentication...</span>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2 text-xs text-rose-600 font-medium">
                {error}
              </div>
            )
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#4285F4]" />
              <span className="text-xs text-slate-500 font-medium">Connecting Google accounts...</span>
            </div>
          ) : showCustomForm ? (
            /* Custom Account entry form */
            <form onSubmit={handleCustomSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-3 border border-slate-350 rounded-md text-sm text-slate-900 focus:border-[#4285F4] focus:outline-none transition-all placeholder-slate-400"
                />
              </div>
              <div className="space-y-1">
                <input
                  type="email"
                  required
                  placeholder="Email or phone"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-3 border border-slate-350 rounded-md text-sm text-slate-900 focus:border-[#4285F4] focus:outline-none transition-all placeholder-slate-400"
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="text-xs font-semibold text-[#4285F4] hover:text-blue-700"
                >
                  Back to accounts
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4285F4] hover:bg-blue-600 text-white font-medium text-xs rounded transition-colors"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            /* Choose Account List (Mimics official layout) */
            <div className="divide-y divide-slate-200 border-y border-slate-200 max-h-[280px] overflow-y-auto no-scrollbar">
              
              {/* Account 1 */}
              <button
                onClick={() => handleSelectAccount('john.doe@gmail.com', 'John Doe')}
                className="w-full text-left py-3.5 px-1 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-750 font-bold text-xs">J</div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">John Doe</h3>
                    <span className="text-[11px] text-slate-500 block">john.doe@gmail.com</span>
                  </div>
                </div>
              </button>

              {/* Account 2 */}
              <button
                onClick={() => handleSelectAccount('alex.inspector@snagora.io', 'Alex Inspector')}
                className="w-full text-left py-3.5 px-1 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent-surface flex items-center justify-center text-accent font-bold text-xs">A</div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Alex Inspector</h3>
                    <span className="text-[11px] text-slate-500 block">alex.inspector@snagora.io</span>
                  </div>
                </div>
              </button>

              {/* Use Another Account */}
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full text-left py-3.5 px-1 hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">Use another account</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer actions and standard disclaimer */}
        <div className="space-y-6 pt-4">
          {!isSupabaseConfigured() && !showCustomForm && (
            <p className="text-[11px] text-slate-500 leading-normal">
              To continue, Google will share your name, email address, language preference, and profile picture with Snagora. Before using this app, you can review Snagora's <span className="text-[#4285F4] cursor-pointer hover:underline">Privacy Policy</span> and <span className="text-[#4285F4] cursor-pointer hover:underline">Terms of Service</span>.
            </p>
          )}

          <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
            <button 
              onClick={handleCancel}
              className="font-medium hover:text-slate-800"
            >
              Cancel
            </button>
            <div className="flex gap-4">
              <span className="hover:underline cursor-pointer">Help</span>
              <span className="hover:underline cursor-pointer">Privacy</span>
              <span className="hover:underline cursor-pointer">Terms</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
