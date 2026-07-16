'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import {
  ArrowLeft, User, CreditCard, Sun, Moon, Shield,
  Trash2, LogOut, ChevronRight, Info, AlertTriangle,
  Smartphone, FileText
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { clearLicense, subscriptionStatus, license } = useLicenseStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);

  // Theme from layout state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('inspection_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  if (!user) return null;

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('inspection_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClearData = async () => {
    await clearLicense();
    localStorage.removeItem('inspection_user');
    localStorage.removeItem('Snagora_jwt_token');
    localStorage.removeItem('Snagora_device_id');
    localStorage.removeItem('inspection_active_draft');
    window.location.href = '/';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'My Profile', description: 'View registration details', href: '/profile' },
        { 
          icon: CreditCard, 
          label: 'Subscription', 
          description: !license || license.customerId?.includes('skip') || license.customerId?.includes('sales')
            ? 'Free Trial (Click to Activate)' 
            : (subscriptionStatus === 'active' ? 'Active plan' : 'Inactive'), 
          href: !license || license.customerId?.includes('skip') || license.customerId?.includes('sales')
            ? '/activate' 
            : '/subscription' 
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: theme === 'light' ? Moon : Sun,
          label: 'Dark Mode',
          description: theme === 'dark' ? 'Currently enabled' : 'Currently disabled',
          action: toggleTheme,
          toggle: true,
          toggleValue: theme === 'dark',
        },
      ],
    },
    {
      title: 'App Information',
      items: [
        { icon: Shield, label: 'App Version', description: '1.0.0 (Build 1)', static: true },
        { icon: Smartphone, label: 'Platform', description: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Android') ? 'Android (Capacitor)' : 'Web Browser') : 'Web', static: true },
        { icon: FileText, label: 'License Status', description: subscriptionStatus === 'active' ? 'Valid' : subscriptionStatus === 'expired' ? 'Expired' : 'Inactive', static: true },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: Trash2, label: 'Clear All Local Data', description: 'Reset app and remove all data', action: () => setShowClearDataModal(true), danger: true },
        { icon: LogOut, label: 'Logout', description: 'Sign out of this device', action: () => setShowLogoutModal(true), danger: true },
      ],
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-background h-[calc(100vh-7.5rem)] w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-24 min-h-0">

        {/* Header */}
        <div>
          <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Configuration</span>
          <h2 className="text-lg font-black text-foreground">Settings</h2>
        </div>

        {/* Menu Sections */}
        {menuSections.map(section => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              {section.title}
            </h3>
            <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden divide-y divide-border">
              {section.items.map((item: any) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-center gap-3 p-3.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      item.danger
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold block ${item.danger ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{item.description}</span>
                    </div>
                    {item.toggle !== undefined ? (
                      <div
                        className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                          item.toggleValue ? 'bg-gradient-to-r from-gradient-from to-gradient-to' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        onClick={item.action}
                      >
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          item.toggleValue ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </div>
                    ) : !item.static && (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                );

                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} className="block hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {content}
                    </Link>
                  );
                }

                if (item.action && !item.toggle) {
                  return (
                    <button key={item.label} onClick={item.action} className="w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {content}
                    </button>
                  );
                }

                return <div key={item.label}>{content}</div>;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Confirm Logout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
                Your inspection data and license will remain on this device.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 h-10 rounded-xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleLogout} className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mx-auto animate-bounce">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Clear All Data?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
                This will reset the app, remove your license, and delete all local data including inspections. <span className="font-bold text-foreground">This cannot be undone.</span>
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowClearDataModal(false)} className="flex-1 h-10 rounded-xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleClearData} className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow">Yes, Clear Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
