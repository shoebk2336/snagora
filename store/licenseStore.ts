/**
 * License lifecycle Zustand store.
 * Manages license storage, validation, credit tracking, and expiry detection.
 */

import { create } from 'zustand';
import { secureStore, secureRetrieve, secureRemove, verifyLicenseSignature, detectTimeTampering, recordCurrentTime } from '@/utils/crypto';
import type { License } from '@/api/mockResponses';
import { consumeCreditsOnBackend } from '@/api/licenseApi';
import { useAuthStore } from './authStore';

const LICENSE_STORAGE_KEY = 'snagora_license';
const VALIDATION_WINDOW_DAYS = 28;

export type SubscriptionStatus = 'inactive' | 'active' | 'expired' | 'pending_validation';

interface LicenseState {
  license: License | null;
  subscriptionStatus: SubscriptionStatus;
  reportCreditsRemaining: number;
  isUnlimited: boolean;
  isExpired: boolean;
  needsValidation: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  minSupportedVersion: string;
  isLoaded: boolean;

  // Actions
  storeLicense: (license: License) => Promise<void>;
  loadLicense: () => Promise<License | null>;
  validateStoredLicense: () => Promise<boolean>;
  consumeCredit: () => Promise<boolean>;
  checkExpiry: () => boolean;
  checkValidationWindow: () => boolean;
  updateVersionInfo: (latest: string, min: string, force: boolean) => void;
  clearLicense: () => Promise<void>;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  license: null,
  subscriptionStatus: 'inactive',
  reportCreditsRemaining: 0,
  isUnlimited: false,
  isExpired: false,
  needsValidation: false,
  forceUpdate: false,
  latestVersion: '1.0.0',
  minSupportedVersion: '1.0.0',
  isLoaded: false,

  storeLicense: async (license: License) => {
    try {
      // Verify the license signature before storing, unless it is a mock/simulated license
      const isMockLicense = license.customerId.startsWith('lic-') || 
                            license.customerId.startsWith('demo-') || 
                            license.signature === 'mock-signature';
      
      let isValid = true;
      if (!isMockLicense) {
        const payloadWithoutSig = { ...license };
        delete (payloadWithoutSig as any).signature;
        const payloadStr = JSON.stringify(payloadWithoutSig);
        isValid = await verifyLicenseSignature(payloadStr, license.signature);
      }

      if (!isValid) {
        console.error('License signature verification failed — rejecting license');
        return;
      }

      // Encrypt and store
      await secureStore(LICENSE_STORAGE_KEY, license);
      recordCurrentTime();

      set({
        license,
        subscriptionStatus: 'active',
        reportCreditsRemaining: license.reportCredits,
        isUnlimited: license.unlimitedReports,
        isExpired: false,
        needsValidation: false,
        forceUpdate: license.forceUpdate,
        latestVersion: license.latestVersion,
        minSupportedVersion: license.minSupportedVersion,
        isLoaded: true,
      });
    } catch (e) {
      console.error('Failed to store license:', e);
    }
  },

  loadLicense: async () => {
    try {
      const license = await secureRetrieve<License>(LICENSE_STORAGE_KEY);

      if (!license) {
        set({ license: null, subscriptionStatus: 'inactive', isLoaded: true });
        return null;
      }

      // Check for time tampering
      if (detectTimeTampering()) {
        console.warn('Time tampering detected — license may be invalid');
        set({
          license,
          subscriptionStatus: 'pending_validation',
          needsValidation: true,
          isLoaded: true,
        });
        return license;
      }

      const now = Date.now();
      const isExpired = now > license.expiryDate;
      const daysSinceValidation = (now - license.lastValidationDate) / (1000 * 60 * 60 * 24);
      const needsValidation = daysSinceValidation >= VALIDATION_WINDOW_DAYS;

      set({
        license,
        subscriptionStatus: isExpired ? 'expired' : needsValidation ? 'pending_validation' : 'active',
        reportCreditsRemaining: license.reportCredits,
        isUnlimited: license.unlimitedReports,
        isExpired,
        needsValidation,
        forceUpdate: license.forceUpdate,
        latestVersion: license.latestVersion,
        minSupportedVersion: license.minSupportedVersion,
        isLoaded: true,
      });

      return license;
    } catch (e) {
      console.error('Failed to load license:', e);
      set({ license: null, subscriptionStatus: 'inactive', isLoaded: true });
      return null;
    }
  },

  validateStoredLicense: async () => {
    const license = get().license;
    if (!license) return false;

    try {
      const payloadWithoutSig = { ...license };
      delete (payloadWithoutSig as any).signature;
      const payloadStr = JSON.stringify(payloadWithoutSig);
      return await verifyLicenseSignature(payloadStr, license.signature);
    } catch {
      return false;
    }
  },

  consumeCredit: async () => {
    const { isUnlimited, reportCreditsRemaining, license } = get();

    if (isUnlimited) return true;

    if (reportCreditsRemaining < 5) return false;

    const newCredits = reportCreditsRemaining - 5;
    set({ reportCreditsRemaining: newCredits });

    // Update stored license locally
    if (license) {
      const updatedLicense = { ...license, reportCredits: newCredits };
      await secureStore(LICENSE_STORAGE_KEY, updatedLicense);
      set({ license: updatedLicense });
    }

    // Sync consumed credits with mock backend server database
    try {
      const authState = useAuthStore.getState();
      const customerId = authState.user?.customerId || license?.customerId || '';
      const deviceId = authState.user?.deviceId || license?.deviceId || '';
      if (customerId && deviceId) {
        await consumeCreditsOnBackend(customerId, deviceId, 5);
      }
    } catch (err) {
      console.error('Failed to sync consumed credits to backend:', err);
    }

    return true;
  },

  checkExpiry: () => {
    const { license } = get();
    if (!license) return true;

    const isExpired = Date.now() > license.expiryDate;
    set({ isExpired });
    return isExpired;
  },

  checkValidationWindow: () => {
    const { license } = get();
    if (!license) return true;

    const daysSince = (Date.now() - license.lastValidationDate) / (1000 * 60 * 60 * 24);
    const needsValidation = daysSince >= VALIDATION_WINDOW_DAYS;
    set({ needsValidation });
    return needsValidation;
  },

  updateVersionInfo: (latest, min, force) => {
    set({
      latestVersion: latest,
      minSupportedVersion: min,
      forceUpdate: force,
    });
  },

  clearLicense: async () => {
    secureRemove(LICENSE_STORAGE_KEY);
    set({
      license: null,
      subscriptionStatus: 'inactive',
      reportCreditsRemaining: 0,
      isUnlimited: false,
      isExpired: false,
      needsValidation: false,
      forceUpdate: false,
      isLoaded: true,
    });
  },

  setSubscriptionStatus: (status) => {
    set({ subscriptionStatus: status });
  },
}));

// ─── Helper Selectors ─────────────────────────────────────────────────────────

export const canCreateInspection = () => {
  const state = useLicenseStore.getState();
  return state.subscriptionStatus === 'active' && !state.isExpired;
};

export const canExportReport = () => {
  const state = useLicenseStore.getState();
  const authState = useAuthStore.getState();
  if ((authState.user?.status as string) === 'locked' || (authState.user?.status as string) === 'LOCKED') return false;
  if (state.isExpired || state.subscriptionStatus !== 'active') return false;
  if (state.isUnlimited) return true;
  return state.reportCreditsRemaining >= 5;
};

export const getDaysUntilExpiry = () => {
  const license = useLicenseStore.getState().license;
  if (!license) return 0;
  const diff = license.expiryDate - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const getDaysSinceValidation = () => {
  const license = useLicenseStore.getState().license;
  if (!license) return 999;
  const diff = Date.now() - license.lastValidationDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
