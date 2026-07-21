'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import {
  ArrowLeft, User, CreditCard, Sun, Moon, Shield,
  Trash2, LogOut, ChevronRight, Info, AlertTriangle,
  Smartphone, FileText, Coins, X, Award, Terminal, Mail, MessageSquare
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { clearLicense, subscriptionStatus, license } = useLicenseStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<'shoeb' | 'rayyan' | null>(null);

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
        {
          icon: Coins,
          label: 'Purchase Mode',
          description: 'Buy credits, activate coupons, or upgrade',
          href: '/activate'
        },
        {
          icon: Mail,
          label: 'Contact Admin',
          description: 'Submit support tickets or license requests',
          href: '/activate?method=sales'
        },
        {
          icon: MessageSquare,
          label: 'Connect on WhatsApp',
          description: 'Chat directly with support on WhatsApp',
          href: 'https://wa.me/917020821097?text=Hi%20Snagora%20Support%2C%20I%20have%20an%20inquiry%20regarding%20my%20subscription.'
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
        { icon: Info, label: 'About Us', description: 'Developed by & Domain Experts', action: () => setShowAboutModal(true) },
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
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-4 min-h-0">

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

      {/* About Us Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
          <div className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50 dark:bg-slate-850/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-from to-gradient-to text-white shadow-sm">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">About Snagora</h3>
              </div>
              <button 
                onClick={() => setShowAboutModal(false)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-xs mx-auto leading-relaxed">
                Snagora is a state-of-the-art offline-first inspection and building snagging platform designed for modern field operations.
              </p>

              {/* Shoeb Muzaffar Khan Card */}
              <div 
                className="group p-4 rounded-2xl border border-border bg-slate-50 dark:bg-slate-850/40 hover:border-accent/40 transition-all duration-300"
                onMouseEnter={() => setExpandedPerson('shoeb')}
                onMouseLeave={() => setExpandedPerson(null)}
                onClick={() => setExpandedPerson(expandedPerson === 'shoeb' ? null : 'shoeb')}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-accent flex items-center gap-1">
                      <Terminal className="h-3 w-3" /> Developed By
                    </span>
                    <h4 className="text-sm font-black text-foreground">Shoeb Muzaffar Khan</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Designer & Developer</p>
                  </div>
                  <button className="text-[10px] font-bold text-accent px-2.5 py-1 rounded-lg bg-accent-surface border border-accent-light/20 shadow-sm active:scale-95 transition-transform">
                    {expandedPerson === 'shoeb' ? 'Collapse' : 'View Contributions'}
                  </button>
                </div>

                {/* Collapsible content (Unique Contributions) */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedPerson === 'shoeb' ? 'max-h-60 opacity-100 mt-3.5 pt-3.5 border-t border-dashed border-border' : 'max-h-0 opacity-0'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Responsible For:</span>
                  <ul className="space-y-1.5">
                    {['Product Design', 'UI/UX', 'Mobile Application Development', 'System Architecture', 'Offline Reporting Engine'].map((item) => (
                      <li key={item} className="text-xs text-slate-650 dark:text-slate-350 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rayyan Sohail Deshmukh Card */}
              <div 
                className="group p-4 rounded-2xl border border-border bg-slate-50 dark:bg-slate-850/40 hover:border-accent/40 transition-all duration-300"
                onMouseEnter={() => setExpandedPerson('rayyan')}
                onMouseLeave={() => setExpandedPerson(null)}
                onClick={() => setExpandedPerson(expandedPerson === 'rayyan' ? null : 'rayyan')}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Award className="h-3 w-3" /> Domain Expertise
                    </span>
                    <h4 className="text-sm font-black text-foreground">Rayyan Sohail Deshmukh</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Senior HVAC Supervisor, Dubai</p>
                  </div>
                  <button className="text-[10px] font-bold text-amber-500 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-sm active:scale-95 transition-transform">
                    {expandedPerson === 'rayyan' ? 'Collapse' : 'View Contributions'}
                  </button>
                </div>

                {/* Collapsible content (Unique Contributions) */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedPerson === 'rayyan' ? 'max-h-60 opacity-100 mt-3.5 pt-3.5 border-t border-dashed border-border' : 'max-h-0 opacity-0'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Contributed To:</span>
                  <ul className="space-y-1.5">
                    {['HVAC Inspection Workflow', 'Building Snagging Process', 'Industry Validation', 'Inspection Standards & Field Requirements'].map((item) => (
                      <li key={item} className="text-xs text-slate-650 dark:text-slate-350 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-850/40 text-center">
              <p className="text-[9px] text-slate-400">© 2026 Snagora. All rights reserved.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
