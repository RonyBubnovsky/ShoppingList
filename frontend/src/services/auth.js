/**
 * Authentication helpers for logging in, storing the JWT, and checking whether
 * the saved token can still be used before protected screens render.
 */
const TOKEN_KEY = 'auth_token';

/**
 * Decode a base64url string from a JWT segment.
 *
 * @param {string} value - Encoded JWT payload segment.
 * @returns {string} Decoded JSON string.
 */
const decodeBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
};

/**
 * Read and parse a JWT payload without trusting it for authorization.
 * Backend verification is still the real security boundary.
 *
 * @param {string} token - JWT string from storage or login response.
 * @returns {Record<string, unknown> | null} Parsed payload, or null for invalid tokens.
 */
const parseJwtPayload = (token) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
};

/**
 * Check whether a JWT payload has a valid future expiration.
 *
 * @param {Record<string, unknown> | null} payload - Parsed JWT payload.
 * @returns {boolean} True when the token is missing, malformed, or expired.
 */
const isExpiredPayload = (payload) => {
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
};

export const authService = {
  /**
   * Call backend login and store the returned JWT on success.
   *
   * @param {string} phone - Phone number submitted by the user.
   * @returns {Promise<void>}
   * @throws {Error} Throws on invalid phone, missing token, or network error.
   */
  login: async (phone) => {
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) throw new Error('Unauthorized');

    const { token } = await res.json();
    if (typeof token !== 'string' || isExpiredPayload(parseJwtPayload(token))) {
      throw new Error('Invalid authentication token');
    }

    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Remove the saved JWT.
   *
   * @returns {void}
   */
  logout: () => localStorage.removeItem(TOKEN_KEY),

  /**
   * Get the saved JWT without changing storage.
   *
   * @returns {string | null} Saved token, or null when no token exists.
   */
  getToken: () => localStorage.getItem(TOKEN_KEY),

  /**
   * Check whether the saved JWT exists and has not expired.
   * Expired or malformed tokens are removed before React renders protected UI.
   *
   * @returns {boolean} True when a usable token exists.
   */
  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    if (isExpiredPayload(parseJwtPayload(token))) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }

    return true;
  },
};
