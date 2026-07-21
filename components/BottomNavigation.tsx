'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, FileSpreadsheet, Settings, LogOut, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return null; // No navigation bar for login screen

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: ClipboardList },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleConfirmLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <>
      <div className="shrink-0 z-40 bg-surface border-t border-border shadow-lg pb-safe">
        <div className="flex h-16 items-center justify-around px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path === '/dashboard' && pathname === '/room') || (item.path === '/dashboard' && pathname === '/issue') || (item.path === '/settings' && (pathname === '/profile' || pathname === '/subscription'));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center w-20 h-12 rounded-2xl transition-all ${
                  isActive 
                    ? 'text-accent font-semibold' 
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <div className={`flex items-center justify-center px-4 py-1.5 rounded-full transition-all ${
                  isActive ? 'bg-accent/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-wide">{item.label}</span>
              </Link>
            );
          })}

          {/* Local logout action */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex flex-col items-center justify-center w-20 h-12 rounded-2xl text-slate-500 dark:text-slate-400 font-medium hover:text-rose-500"
          >
            <div className="flex items-center justify-center px-4 py-1.5 rounded-full hover:bg-rose-500/10">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-wide">Logout</span>
          </button>
        </div>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mx-auto animate-bounce">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Confirm Logout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
                Are you sure you want to log out? Your active inspection drafts and offline databases remain safe on this device.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-10 rounded-xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
