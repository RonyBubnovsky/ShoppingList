const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { ensureCsrfToken, rotateCsrfToken } = require('../middleware/csrf');

// Allowlist loaded once at startup from ENV
const ALLOWED_PHONES = [
  process.env.PHONE1,
  process.env.PHONE2,
  process.env.PHONE3,
].filter(Boolean);

/**
 * POST /api/auth/login
 * Body: { phone: "050..." }
 * Returns: { token }  (JWT, 7-day expiry)
 */
router.post('/login', (req, res) => {
  const { phone } = req.body;

  if (!phone || !ALLOWED_PHONES.includes(String(phone).trim())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Create JWT (same expiry as before)
  const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '30d' });

  /*
    Set token as an httpOnly cookie so JavaScript cannot access it (mitigates XSS).
    Cookie settings vary by environment:
    - production: secure, sameSite='none' to allow cross-site usage (Vercel frontend)
    - development: secure=false, sameSite='lax' to simplify localhost testing
  */
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    // Max-Age in ms: 30 days
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // Consider adding domain when you have a stable domain in prod
  };

  // Send cookie and minimal JSON body. Frontend should use fetch(..., { credentials: 'include' }).
  res.cookie('token', token, cookieOptions);
  // Rotate CSRF token at login boundary to bind state-changing requests.
  rotateCsrfToken(res);
  return res.json({ success: true });
});

/**
 * POST /api/auth/logout
 * Clears the httpOnly cookie on the client.
 */
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  res.clearCookie('token', cookieOptions);
  return res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's payload. This is used by the frontend
 * to detect whether an httpOnly cookie session exists.
 */
router.get('/me', authMiddleware, (req, res) => {
  // Ensure CSRF token cookie exists for authenticated browser sessions.
  ensureCsrfToken(req, res);
  return res.json({ user: req.user });
});

module.exports = router;
