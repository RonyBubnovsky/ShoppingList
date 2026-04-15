const TOKEN_KEY = 'auth_token';

export const authService = {
  /**
   * Call backend login, store token on success.
   * @returns {Promise<void>}
   * @throws on invalid phone or network error
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
    localStorage.setItem(TOKEN_KEY, token);
  },

  logout: () => localStorage.removeItem(TOKEN_KEY),

  getToken: () => localStorage.getItem(TOKEN_KEY),

  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};
