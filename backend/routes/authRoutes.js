const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { ensureCsrfToken, rotateCsrfToken } = require('../middleware/csrf');
const { loginRateLimitMiddleware, clearLoginRateLimit } = require('../middleware/loginRateLimit');
const RefreshToken = require('../models/RefreshToken');

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
router.post('/login', loginRateLimitMiddleware, async (req, res) => {
  const { phone } = req.body;

  if (!phone || !ALLOWED_PHONES.includes(String(phone).trim())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Successful authentication clears accumulated failed-attempt state for this IP.
  await clearLoginRateLimit(req);

  const isProd = process.env.NODE_ENV === 'production';
  const devSameSite = process.env.DEV_COOKIE_SAMESITE || null; // set to 'none' to force dev cookies to be SameSite=None

  // Create short-lived access token (JWT)
  const accessToken = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '20m' });

  // Create opaque refresh token (rotate-on-use). Store hashed token in DB.
  const rawRefresh = crypto.randomBytes(64).toString('hex');
  const refreshHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
  const now = new Date();
  const refreshExpiresMs = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000);
  const refreshDoc = new RefreshToken({
    tokenHash: refreshHash,
    phone: String(phone).trim(),
    expiresAt: new Date(now.getTime() + refreshExpiresMs),
  });
  await refreshDoc.save();

  const accessCookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : (devSameSite || 'lax'),
    maxAge: 20 * 60 * 1000, // 20 minutes
  };

  const refreshCookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : (devSameSite || 'lax'),
    maxAge: refreshExpiresMs,
  };

  // Set cookies
  res.cookie('token', accessToken, accessCookieOpts);
  res.cookie('refreshToken', rawRefresh, refreshCookieOpts);

  // Rotate CSRF token at login boundary to bind state-changing requests.
  rotateCsrfToken(res);
  return res.json({ success: true });
});

/**
 * POST /api/auth/logout
 * Clears the httpOnly cookie on the client.
 */
router.post('/logout', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  // Attempt to remove refresh token from DB if present
  try {
    const raw = req.cookies && req.cookies.refreshToken;
    if (raw) {
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      await RefreshToken.deleteOne({ tokenHash: hash });
    }
  } catch (err) {
    console.error('Error clearing refresh token:', err.message);
  }

  // Clear cookies
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  return res.json({ success: true });
});

/**
 * POST /api/auth/refresh
 * Use refresh token cookie to obtain a new access token and rotate refresh token.
 */
router.post('/refresh', async (req, res) => {
  try {
    // Dev-only debug: log presence of cookies and raw Cookie header to diagnose
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_LOG_COOKIES === 'true') {
      console.log('[DEBUG] /auth/refresh called. req.cookies keys:', Object.keys(req.cookies || {}));
      console.log('[DEBUG] /auth/refresh raw header cookie:', req.headers.cookie);
    }
    const raw = req.cookies && req.cookies.refreshToken;
    if (!raw) return res.status(401).json({ error: 'Missing refresh token' });

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const now = new Date();
    const doc = await RefreshToken.findOne({ tokenHash: hash });
    if (!doc || doc.revoked || doc.expiresAt < now) {
      // Possible reuse or expired token
      if (doc) {
        // Revoke any matching token record
        await RefreshToken.deleteOne({ tokenHash: hash });
      }
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: remove old record and create a new one
    await RefreshToken.deleteOne({ tokenHash: hash });

    const newRaw = crypto.randomBytes(64).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const refreshExpiresMs = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000);
    const newDoc = new RefreshToken({ tokenHash: newHash, phone: doc.phone, expiresAt: new Date(now.getTime() + refreshExpiresMs) });
    await newDoc.save();

    // Issue new access token
    const accessToken = jwt.sign({ phone: doc.phone }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '20m' });
    const isProdEnv = process.env.NODE_ENV === 'production';

    const accessCookieOpts = {
      httpOnly: true,
      secure: isProdEnv,
      sameSite: isProdEnv ? 'none' : 'lax',
      maxAge: 20 * 60 * 1000,
    };

    const refreshCookieOpts = {
      httpOnly: true,
      secure: isProdEnv,
      sameSite: isProdEnv ? 'none' : 'lax',
      maxAge: refreshExpiresMs,
    };

    res.cookie('token', accessToken, accessCookieOpts);
    res.cookie('refreshToken', newRaw, refreshCookieOpts);
    return res.json({ success: true });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
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
