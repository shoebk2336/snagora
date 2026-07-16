'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowLeft, User, Mail, Building, Phone,
  Shield, Calendar
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  if (!user) return null;

  const profileSections = [
    {
      title: 'Personal Information',
      items: [
        { icon: User, label: 'Full Name', value: user.name },
        { icon: Mail, label: 'Email', value: user.email || 'Not registered' },
        { icon: Building, label: 'Company', value: user.company || 'Not specified' },
        { icon: Phone, label: 'Mobile', value: user.mobile || 'Not specified' },
        { icon: Shield, label: 'Role', value: user.role },
      ],
    },
    ...(user.googleProfile ? [{
      title: 'Google Connected Account',
      items: [
        { icon: User, label: 'Google Name', value: user.googleProfile.name || 'N/A' },
        { icon: Mail, label: 'Google Email', value: user.googleProfile.email || 'N/A' },
        { icon: Calendar, label: 'Last Logged In', value: user.googleProfile.authenticatedAt ? new Date(user.googleProfile.authenticatedAt).toLocaleString() : 'N/A' },
      ],
    }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col bg-background h-[calc(100vh-7.5rem)] w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-24 min-h-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Account</span>
            <h2 className="text-base font-bold text-foreground">My Profile</h2>
          </div>
        </div>

        {/* Avatar Card */}
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to text-white shadow-md border border-accent/20">
          {user.googleProfile?.picture ? (
            <img 
              src={user.googleProfile.picture} 
              alt="Google Profile Avatar" 
              className="h-14 w-14 rounded-2xl bg-white object-cover border border-white/25 shadow-inner"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white text-xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold">{user.name}</h3>
            <p className="text-xs opacity-80">{user.email || 'No email registered'}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold mt-1">
              <Shield className="h-3 w-3" /> {user.role}
            </span>
          </div>
        </div>

        {/* Info Sections */}
        {profileSections.map(section => (
          <div key={section.title} className="p-4 rounded-3xl border border-border bg-surface shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {section.title}
            </h3>
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 text-xs">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{item.label}</span>
                    <span className="font-semibold text-foreground truncate block">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
