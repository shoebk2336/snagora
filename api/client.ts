/**
 * Base HTTP client wrapping fetch() with JWT auth, error handling, and retry.
 * In production, update BASE_URL to the real backend.
 */

// Will be set to real API URL when backend is available
const BASE_URL = '';

// Using mock mode since backend is not available yet
const USE_MOCK = true;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  retries?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Get the stored JWT token for authenticated requests.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('Snagora_jwt_token');
}

/**
 * Store the JWT token after authentication.
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('Snagora_jwt_token', token);
}

/**
 * Clear the JWT token on logout.
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('Snagora_jwt_token');
}

/**
 * Make an authenticated API request with retry support.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, retries = 2 } = options;

  // If mock mode, we don't actually make HTTP requests
  if (USE_MOCK) {
    throw new Error(`Mock mode active — use mock API functions instead. Endpoint: ${endpoint}`);
  }

  const token = getAuthToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data, statusCode: response.status };
      }

      // Handle specific error codes
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          error: 'Authentication expired. Please sign in again.',
          statusCode: 401,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'Unauthorized device. Please re-register.',
          statusCode: 403,
        };
      }

      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || `Request failed with status ${response.status}`,
        statusCode: response.status,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Network request failed. Please check your connection.',
  };
}

/**
 * Check if the device currently has internet connectivity.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine;
}
