/**
 * Device information collection for registration and license binding.
 */

export interface DeviceInfo {
  deviceId: string;       // Stable device fingerprint
  platform: string;       // e.g. 'Android', 'iOS', 'Web'
  model: string;          // Device model or browser name
  manufacturer: string;   // e.g. 'Google', 'Samsung', browser vendor
  osVersion: string;      // Android version or browser version
  appVersion: string;     // Snagora app version
  screenResolution: string;
  language: string;
}

// App version — kept in sync with package.json
const APP_VERSION = '1.0.0';

function getBrowserInfo(): { name: string; version: string; vendor: string } {
  if (typeof navigator === 'undefined') {
    return { name: 'Server', version: '0', vendor: 'N/A' };
  }

  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = '0';

  if (ua.includes('Chrome/')) {
    name = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Firefox/')) {
    name = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Edg/')) {
    name = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
  }

  return {
    name,
    version,
    vendor: navigator.vendor || 'Unknown',
  };
}

function getPlatform(): string {
  if (typeof navigator === 'undefined') return 'Server';
  
  const ua = navigator.userAgent;
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Web';
}

function getOSVersion(): string {
  if (typeof navigator === 'undefined') return '0';
  
  const ua = navigator.userAgent;
  // Android version
  const androidMatch = ua.match(/Android\s(\d+[\.\d]*)/);
  if (androidMatch) return androidMatch[1];

  // iOS version
  const iosMatch = ua.match(/OS\s(\d+[_\d]*)\slike/);
  if (iosMatch) return iosMatch[1].replace(/_/g, '.');

  // Windows version
  const winMatch = ua.match(/Windows NT\s(\d+\.?\d*)/);
  if (winMatch) return winMatch[1];

  return getBrowserInfo().version;
}

/**
 * Generate a stable device ID that persists across sessions.
 * Uses localStorage to maintain consistency.
 */
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  
  const DEVICE_ID_KEY = 'Snagora_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a UUID-like device ID
    deviceId = 'dev-' + crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Collect all device information for registration.
 */
export function collectDeviceInfo(): DeviceInfo {
  const browser = getBrowserInfo();
  
  return {
    deviceId: getOrCreateDeviceId(),
    platform: getPlatform(),
    model: browser.name,
    manufacturer: browser.vendor,
    osVersion: getOSVersion(),
    appVersion: APP_VERSION,
    screenResolution: typeof screen !== 'undefined' 
      ? `${screen.width}x${screen.height}` 
      : 'unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
  };
}

/**
 * Get the current app version string.
 */
export function getAppVersion(): string {
  return APP_VERSION;
}
