/**
 * Mock API responses for demo/testing.
 * All functions simulate backend behavior with realistic data.
 * Swap with real API calls when backend is available.
 */

import { generateSignature } from '@/utils/crypto';
import type { DeviceInfo } from '@/utils/deviceInfo';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface License {
  customerId: string;
  companyId: string;
  deviceId: string;
  subscriptionPlan: 'starter' | 'professional' | 'enterprise';
  reportCredits: number;
  unlimitedReports: boolean;
  activationDate: number;   // timestamp ms
  expiryDate: number;       // timestamp ms
  lastValidationDate: number;
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  signature: string;        // HMAC signature of the license payload
}

export interface RegistrationProfile {
  fullName: string;
  companyName: string;
  email: string;
  mobile: string;
}

export interface RegistrationResponse {
  success: boolean;
  customerId: string;
  companyId: string;
  token: string;  // JWT
  message: string;
}

export interface ActivationResponse {
  success: boolean;
  license: License;
  message: string;
}

export interface ValidationResponse {
  success: boolean;
  subscriptionActive: boolean;
  license: License;
  updatedCredits: number;
  message: string;
}

export interface VersionCheckResponse {
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  downloadUrl: string;
  releaseNotes: string;
}

// ─── Mock Delays ──────────────────────────────────────────────────────────────

const simulateDelay = (ms: number = 1200) =>
  new Promise(resolve => setTimeout(resolve, ms + Math.random() * 800));

// ─── Mock License Generator ──────────────────────────────────────────────────

function getBackendCredits(plan: 'starter' | 'professional' | 'enterprise'): number {
  if (typeof window === 'undefined') {
    return plan === 'enterprise' ? 9999 : plan === 'professional' ? 100 : 25;
  }
  const stored = localStorage.getItem('Snagora_backend_credits');
  if (stored !== null) {
    return parseInt(stored, 10);
  }
  const defaultCredits = plan === 'enterprise' ? 9999 : plan === 'professional' ? 100 : 25;
  localStorage.setItem('Snagora_backend_credits', String(defaultCredits));
  return defaultCredits;
}

function setBackendCredits(credits: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('Snagora_backend_credits', String(credits));
  }
}

async function createMockLicense(
  customerId: string,
  companyId: string,
  deviceId: string,
  plan: 'starter' | 'professional' | 'enterprise' = 'professional'
): Promise<License> {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const credits = getBackendCredits(plan);

  const licensePayload = {
    customerId,
    companyId,
    deviceId,
    subscriptionPlan: plan,
    reportCredits: credits,
    unlimitedReports: plan === 'enterprise',
    activationDate: now,
    expiryDate: now + thirtyDays,
    lastValidationDate: now,
    minSupportedVersion: '1.0.0',
    latestVersion: '1.0.0',
    forceUpdate: false,
  };

  const payloadStr = JSON.stringify(licensePayload);
  const signature = await generateSignature(payloadStr);

  return {
    ...licensePayload,
    signature,
  };
}

// ─── Mock API Functions ───────────────────────────────────────────────────────

/**
 * Simulate device registration with backend.
 */
export async function mockRegisterDevice(
  profile: RegistrationProfile,
  deviceInfo: DeviceInfo
): Promise<RegistrationResponse> {
  await simulateDelay();

  // Simulate validation
  if (!profile.email.includes('@')) {
    return {
      success: false,
      customerId: '',
      companyId: '',
      token: '',
      message: 'Invalid email address.',
    };
  }

  const customerId = 'cust-' + Date.now().toString(36);
  const companyId = 'comp-' + profile.companyName.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  
  // Generate a mock JWT token
  const tokenPayload = btoa(JSON.stringify({
    sub: customerId,
    company: companyId,
    device: deviceInfo.deviceId,
    iat: Date.now(),
    exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
  }));
  const token = `eyJ0eXAi.${tokenPayload}.mock-signature`;

  return {
    success: true,
    customerId,
    companyId,
    token,
    message: 'Device registered successfully.',
  };
}

/**
 * Simulate Google Sign-In token verification.
 */
export async function mockVerifyGoogleToken(
  idToken: string
): Promise<{ success: boolean; email: string; name: string; picture: string }> {
  await simulateDelay(800);

  // In mock mode, accept any token and return dummy data
  return {
    success: true,
    email: 'inspector@Snagora.io',
    name: 'Field Inspector',
    picture: '',
  };
}

/**
 * Simulate UPI payment verification and license activation.
 */
export async function mockActivateWithPayment(
  customerId: string,
  companyId: string,
  deviceId: string,
  paymentRef: string
): Promise<ActivationResponse> {
  await simulateDelay(2000);

  if (!paymentRef || paymentRef.length < 4) {
    return {
      success: false,
      license: {} as License,
      message: 'Payment verification failed. Invalid transaction reference.',
    };
  }

  setBackendCredits(100);
  const license = await createMockLicense(customerId, companyId, deviceId, 'professional');

  return {
    success: true,
    license,
    message: 'Payment verified. Subscription activated successfully.',
  };
}

/**
 * Simulate coupon code activation.
 */
export async function mockActivateWithCoupon(
  customerId: string,
  companyId: string,
  deviceId: string,
  couponCode: string
): Promise<ActivationResponse> {
  await simulateDelay(1500);

  const validCoupons: Record<string, 'starter' | 'professional' | 'enterprise'> = {
    'INSPECT2024': 'professional',
    'ENTERPRISE': 'enterprise',
    'TRIAL': 'starter',
    'DEMO': 'professional',
    'PRO100': 'professional',
  };

  const plan = validCoupons[couponCode.toUpperCase()];
  if (!plan) {
    return {
      success: false,
      license: {} as License,
      message: 'Invalid coupon code. Please check and try again.',
    };
  }

  const defaultCredits = plan === 'enterprise' ? 9999 : plan === 'professional' ? 100 : 25;
  setBackendCredits(defaultCredits);
  const license = await createMockLicense(customerId, companyId, deviceId, plan);

  return {
    success: true,
    license,
    message: `Coupon applied! ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated.`,
  };
}

/**
 * Simulate monthly license validation.
 */
export async function mockValidateLicense(
  deviceId: string,
  customerId: string
): Promise<ValidationResponse> {
  await simulateDelay(1200);

  const license = await createMockLicense(customerId, 'comp-default', deviceId, 'professional');

  return {
    success: true,
    subscriptionActive: true,
    license,
    updatedCredits: license.reportCredits,
    message: 'License validated successfully. Valid for another 28 days.',
  };
}

/**
 * Simulate version check.
 */
export async function mockCheckVersion(
  currentVersion: string
): Promise<VersionCheckResponse> {
  await simulateDelay(500);

  return {
    latestVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    forceUpdate: false,
    downloadUrl: 'https://Snagora.io/download/latest.apk',
    releaseNotes: 'Bug fixes and performance improvements.',
  };
}

/**
 * Simulate subscription renewal.
 */
export async function mockRenewSubscription(
  customerId: string,
  companyId: string,
  deviceId: string
): Promise<ActivationResponse> {
  await simulateDelay(1500);

  setBackendCredits(100);
  const license = await createMockLicense(customerId, companyId, deviceId, 'professional');

  return {
    success: true,
    license,
    message: 'Subscription renewed successfully for another 30 days.',
  };
}

/**
 * Simulate credit consumption on the backend server.
 */
export async function mockConsumeCreditsOnBackend(
  customerId: string,
  deviceId: string,
  creditsToDeduct: number
): Promise<{ success: boolean; remainingCredits: number }> {
  await simulateDelay(500);

  let credits = 100;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('Snagora_backend_credits');
    credits = stored ? parseInt(stored, 10) : 100;
    credits = Math.max(0, credits - creditsToDeduct);
    localStorage.setItem('Snagora_backend_credits', String(credits));
  }

  return {
    success: true,
    remainingCredits: credits,
  };
}
