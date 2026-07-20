import { create } from 'zustand';
import { secureStore, secureRetrieve, secureRemove } from '@/utils/crypto';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

export type UserRole = 'Technician' | 'Auditor' | 'Inspector';
export type RegistrationStatus = 'unregistered' | 'registered' | 'activated';

export interface GoogleProfile {
  googleIdToken: string;
  email: string;
  name: string;
  picture?: string;
  authenticatedAt: string;
}

export interface User {
  name: string;
  role: UserRole;
  email?: string;
  company?: string;
  mobile?: string;
  customerId?: string;
  companyId?: string;
  deviceId?: string;
  registeredAt?: number;
  registrationStatus?: RegistrationStatus;
  age?: number;
  designation?: string;
  googleIdToken?: string;
  googleProfile?: GoogleProfile;
  status?: 'active' | 'locked';
}

interface AuthState {
  user: User | null;
  isLoaded: boolean;
  login: (name: string, role: UserRole, idToken?: string, googleProfile?: GoogleProfile) => Promise<void>;
  logout: () => Promise<void>;
  setRegistration: (data: {
    email: string;
    company: string;
    mobile: string;
    customerId: string;
    companyId: string;
    deviceId: string;
    age?: number;
    designation?: string;
  }) => Promise<void>;
  setActivated: () => Promise<void>;
  loadSession: () => Promise<User | null>;
  syncSupabaseSession: (supabaseUser: any) => Promise<void>;
  toggleStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoaded: false,
  login: async (name, role, idToken, googleProfile) => {
    const existing = get().user;
    let initialStatus = existing?.status || 'active';
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem('snagora_lock_override');
      if (override === 'locked' || override === 'active') {
        initialStatus = override as any;
      }
    }
    const user: User = {
      ...existing,
      name,
      role,
      googleIdToken: idToken || existing?.googleIdToken,
      registrationStatus: existing?.registrationStatus || 'unregistered',
      googleProfile: googleProfile || existing?.googleProfile,
      status: initialStatus,
    };
    await secureStore('inspection_user', user);
    set({ user });
  },
  logout: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out of Supabase:', err);
      }
    }
    secureRemove('inspection_user');
    set({ user: null });
  },
  setRegistration: async (data) => {
    const existing = get().user;
    const user: User = {
      name: existing?.name || '',
      role: existing?.role || 'Inspector',
      email: data.email,
      company: data.company,
      mobile: data.mobile,
      age: data.age,
      designation: data.designation,
      googleIdToken: existing?.googleIdToken,
      customerId: data.customerId,
      companyId: data.companyId,
      deviceId: data.deviceId,
      registeredAt: Date.now(),
      registrationStatus: 'registered',
      googleProfile: existing?.googleProfile,
      status: existing?.status || 'active',
    };
    await secureStore('inspection_user', user);
    set({ user });
  },
  setActivated: async () => {
    const existing = get().user;
    if (!existing) return;
    const user: User = {
      ...existing,
      registrationStatus: 'activated',
    };
    await secureStore('inspection_user', user);
    set({ user });
  },
  loadSession: async () => {
    try {
      let user = await secureRetrieve<User>('inspection_user');
      if (user && !user.status) {
        user.status = 'active';
      }

      // Apply local simulation override if present (for testing banner)
      if (user && typeof window !== 'undefined') {
        const override = localStorage.getItem('snagora_lock_override');
        if (override === 'locked' || override === 'active') {
          user.status = override as any;
        }
      }
      
      // If Supabase is configured, check if we have a current session to keep in sync
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const sUser = session.user;
          let backendStatus: 'active' | 'locked' = user?.status || 'active';
          let backendRole = user?.role || 'Inspector';
          
          try {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('status, role')
              .eq('id', sUser.id)
              .single();
            if (dbProfile) {
              const statusStr = String(dbProfile.status).toLowerCase();
              backendStatus = (statusStr === 'locked' || statusStr === 'inactive') ? 'locked' : 'active';
              if (dbProfile.role) {
                backendRole = (dbProfile.role.charAt(0).toUpperCase() + dbProfile.role.slice(1)) as UserRole;
              }
            }
          } catch (err) {
            console.warn('Failed to fetch backend profile status:', err);
          }

          // Apply local simulator override if present
          if (typeof window !== 'undefined') {
            const override = localStorage.getItem('snagora_lock_override');
            if (override === 'locked' || override === 'active') {
              backendStatus = override as any;
            }
          }

          const name = sUser.user_metadata?.full_name || sUser.user_metadata?.name || user?.name || sUser.email?.split('@')[0] || 'User';
          user = {
            ...user,
            name,
            email: sUser.email || user?.email,
            googleIdToken: sUser.id,
            registrationStatus: user?.registrationStatus || 'unregistered',
            role: backendRole,
            status: backendStatus,
            googleProfile: {
              googleIdToken: session.access_token || sUser.id,
              email: sUser.email || '',
              name,
              picture: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture,
              authenticatedAt: new Date().toISOString()
            }
          };
          await secureStore('inspection_user', user);
        }
      }
      
      set({ user, isLoaded: true });
      return user;
    } catch (e) {
      console.error('Failed to load secure session:', e);
      set({ user: null, isLoaded: true });
      return null;
    }
  },
  syncSupabaseSession: async (supabaseUser) => {
    if (!supabaseUser) return;
    const existing = get().user;
    let backendStatus: 'active' | 'locked' = existing?.status || 'active';
    let backendRole = existing?.role || 'Inspector';

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', supabaseUser.id)
          .single();
        if (dbProfile) {
          const statusStr = String(dbProfile.status).toLowerCase();
          backendStatus = (statusStr === 'locked' || statusStr === 'inactive') ? 'locked' : 'active';
          if (dbProfile.role) {
            backendRole = (dbProfile.role.charAt(0).toUpperCase() + dbProfile.role.slice(1)) as UserRole;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch backend profile status during sync:', err);
      }
    }

    // Apply local simulator override if present
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem('snagora_lock_override');
      if (override === 'locked' || override === 'active') {
        backendStatus = override as any;
      }
    }

    const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || existing?.name || supabaseUser.email?.split('@')[0] || 'User';
    const email = supabaseUser.email || existing?.email;
    const user: User = {
      ...existing,
      name,
      email,
      role: backendRole,
      googleIdToken: supabaseUser.id,
      registrationStatus: existing?.registrationStatus || 'unregistered',
      googleProfile: {
        googleIdToken: supabaseUser.id,
        email: email || '',
        name,
        picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        authenticatedAt: new Date().toISOString()
      },
      status: backendStatus,
    };
    await secureStore('inspection_user', user);
    set({ user });
  },
  toggleStatus: async () => {
    const existing = get().user;
    if (!existing) return;
    const newStatus = existing.status === 'locked' ? 'active' : 'locked';

    // Store simulator override in localStorage so it persists across pages/refresh
    if (typeof window !== 'undefined') {
      localStorage.setItem('snagora_lock_override', newStatus);
    }

    const user: User = {
      ...existing,
      status: newStatus,
    };

    // If Supabase is active, update the real database profile status as well
    if (isSupabaseConfigured() && supabase && existing.googleIdToken) {
      try {
        const dbStatus = newStatus === 'locked' ? 'LOCKED' : 'ACTIVE';
        await supabase
          .from('profiles')
          .update({ status: dbStatus })
          .eq('id', existing.googleIdToken);
      } catch (err) {
        console.warn('Failed to update Supabase status on toggle:', err);
      }
    }

    await secureStore('inspection_user', user);
    set({ user });
  },
}));

// Permission selectors based on role
export const hasAuditorOrInspectorPermission = (role?: UserRole) => {
  return role === 'Auditor' || role === 'Inspector';
};

export const hasInspectorPermission = (role?: UserRole) => {
  return role === 'Inspector';
};

export const getRoleDashboardLabel = (role: UserRole) => {
  switch (role) {
    case 'Technician':
      return 'Field Technician (Data Capture)';
    case 'Auditor':
      return 'Auditor (Review & Reporting)';
    case 'Inspector':
      return 'Inspector (Full Controls & Admin)';
  }
};
