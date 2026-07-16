import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Clean trailing slashes or /rest/v1 suffixes from the URL to make configuration robust
const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Checks if the Supabase environment variables are configured with actual credentials.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  // Check if they are still the default placeholders
  if (supabaseUrl.includes('your-supabase-project') || supabaseUrl === 'https://your-supabase-project.supabase.co') {
    return false;
  }
  if (supabaseAnonKey === 'your-supabase-anon-key') {
    return false;
  }
  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    return false;
  }
};

// Create client or set to null if not configured (to avoid throwing errors)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Generates the correct OAuth redirect URL.
 * Prioritizes NEXT_PUBLIC_SITE_URL if set (e.g., in production environment),
 * otherwise falls back to window.location.origin.
 */
export const getOauthRedirectUrl = (path: string): string => {
  if (typeof window === 'undefined') return '';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  // Strip trailing slashes and ensure proper path slash
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

