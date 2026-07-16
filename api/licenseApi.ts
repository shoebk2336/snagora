/**
 * License API service.
 * Routes calls to mock backend (swap with real endpoints when available).
 */

import {
  mockActivateWithPayment,
  mockActivateWithCoupon,
  mockValidateLicense,
  mockCheckVersion,
  mockRenewSubscription,
  mockConsumeCreditsOnBackend,
} from './mockResponses';
import type {
  ActivationResponse,
  ValidationResponse,
  VersionCheckResponse,
} from './mockResponses';

/**
 * Activate subscription via UPI payment reference.
 */
export async function activateWithPayment(
  customerId: string,
  companyId: string,
  deviceId: string,
  paymentRef: string
): Promise<ActivationResponse> {
  return mockActivateWithPayment(customerId, companyId, deviceId, paymentRef);
}

/**
 * Activate subscription via coupon code.
 */
export async function activateWithCoupon(
  customerId: string,
  companyId: string,
  deviceId: string,
  couponCode: string
): Promise<ActivationResponse> {
  return mockActivateWithCoupon(customerId, companyId, deviceId, couponCode);
}

/**
 * Monthly license validation call.
 */
export async function validateLicense(
  deviceId: string,
  customerId: string
): Promise<ValidationResponse> {
  return mockValidateLicense(deviceId, customerId);
}

/**
 * Check for app version updates.
 */
export async function checkVersion(
  currentVersion: string
): Promise<VersionCheckResponse> {
  return mockCheckVersion(currentVersion);
}

/**
 * Renew an expired subscription.
 */
export async function renewSubscription(
  customerId: string,
  companyId: string,
  deviceId: string
): Promise<ActivationResponse> {
  return mockRenewSubscription(customerId, companyId, deviceId);
}

/**
 * Deduct report credit tokens on the backend database.
 */
export async function consumeCreditsOnBackend(
  customerId: string,
  deviceId: string,
  creditsToDeduct: number
): Promise<{ success: boolean; remainingCredits: number }> {
  return mockConsumeCreditsOnBackend(customerId, deviceId, creditsToDeduct);
}
