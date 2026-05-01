import { getCsrfToken } from './csrf';

/**
 * Authentication helpers for logging in, storing the JWT, and checking whether
 * the saved token can still be used before protected screens render.
 */
let currentUser = null;

// Prefer same-origin /api in production to keep auth cookies first-party.
const API_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

/**
 * authService now uses httpOnly cookies for authentication.
 * - `login` performs a credentialed POST; the backend sets an httpOnly cookie.
 * - `getCurrentUser` reads the authenticated user from `/auth/me`.
 * - `logout` clears server cookie and local cached user.
 *
 * Note: httpOnly cookies are not readable from JavaScript by design.
 * We therefore rely on the backend `/auth/me` endpoint to return the
 * authenticated user's payload after login.
 */
export const authService = {
  /**
   * Login using phone number. Backend sets httpOnly cookie on success.
   * Then fetch and cache the current user payload from `/auth/me`.
   *
   * @param {string} phone
   * @returns {Promise<Record<string, any>>} resolved user payload
   */
  login: async (phone) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // important: accept httpOnly cookie
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) throw new Error('Unauthorized');

    // Token is stored in an httpOnly cookie; request current user payload.
    const userRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    if (!userRes.ok) throw new Error('Failed to fetch user after login');
    const data = await userRes.json();
    currentUser = data.user || null;
    return currentUser;
  },

  /**
   * Logout: call backend to clear cookie and remove cached user.
   */
  logout: async () => {
    const csrfToken = getCsrfToken();
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    });
    currentUser = null;
  },

  /**
   * Fetch and return the current authenticated user payload.
   * Used on app boot to determine auth state.
   *
   * @returns {Promise<Record<string, any> | null>}
   */
  getCurrentUser: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      currentUser = null;
      return null;
    }
    const data = await res.json();
    currentUser = data.user || null;
    return currentUser;
  },

  /**
   * Synchronous check whether we have a cached authenticated user.
   * Prefer calling `getCurrentUser()` on app start to refresh this value.
   */
  isAuthenticated: () => Boolean(currentUser),

  /**
   * Return the cached user (may be null). Not a network call.
   */
  getUser: () => currentUser,
};
