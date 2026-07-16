/**
 * Authentication API service.
 * Routes calls to mock backend (swap with real endpoints when available).
 */

import { mockRegisterDevice, mockVerifyGoogleToken } from './mockResponses';
import type { RegistrationProfile, RegistrationResponse } from './mockResponses';
import type { DeviceInfo } from '@/utils/deviceInfo';

/**
 * Register a new device with the backend after Google Sign-In.
 */
export async function registerDevice(
  profile: RegistrationProfile,
  deviceInfo: DeviceInfo
): Promise<RegistrationResponse> {
  // In production: use apiRequest('POST', '/api/v1/register', { profile, deviceInfo })
  return mockRegisterDevice(profile, deviceInfo);
}

/**
 * Verify a Google Sign-In token with the backend.
 */
export async function verifyGoogleToken(
  idToken: string
): Promise<{ success: boolean; email: string; name: string; picture: string }> {
  // In production: use apiRequest('POST', '/api/v1/auth/google', { idToken })
  return mockVerifyGoogleToken(idToken);
}
