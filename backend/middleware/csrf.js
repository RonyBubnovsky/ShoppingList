const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCsrfCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  // Must be persistent (not a session cookie) so it survives browser close.
  // Match the refresh token lifetime so CSRF is always available for silent re-auth.
  const maxAge = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000);
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
};

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const safeEqual = (a, b) => {
  if (!a || !b) return false;
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

/**
 * Ensures a CSRF token cookie exists for the current browser session.
 * Returns the token value (existing or newly generated).
 */
const ensureCsrfToken = (req, res) => {
  const existing = req.cookies && req.cookies[CSRF_COOKIE_NAME];
  if (existing) return existing;

  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
};

/**
 * Rotates the CSRF token cookie (used at login boundary).
 */
const rotateCsrfToken = (res) => {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
};

/**
 * Double-submit CSRF protection middleware.
 *
 * For state-changing requests, requires both:
 * - CSRF cookie:  `csrf_token`
 * - Matching header: `x-csrf-token`
 */
const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  // Login does not require prior CSRF token because user has no session yet.
  if (req.path === '/api/auth/login') return next();

  const csrfCookie = req.cookies && req.cookies[CSRF_COOKIE_NAME];
  const csrfHeader = req.get(CSRF_HEADER_NAME);

  if (!safeEqual(csrfCookie, csrfHeader)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
};

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ensureCsrfToken,
  rotateCsrfToken,
  csrfProtection,
};
