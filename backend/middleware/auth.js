const jwt = require('jsonwebtoken');

const ALLOWED_PHONES = [
  process.env.PHONE1,
  process.env.PHONE2,
  process.env.PHONE3,
].filter(Boolean);

/**
 * Middleware: verify JWT from httpOnly cookie `token` or Authorization header.
 * - Prefer cookie-based tokens (safer against XSS) but keep header fallback
 *   to support any clients that haven't migrated yet.
 * - Attaches decoded payload to `req.user` on success.
 */
const authMiddleware = (req, res, next) => {
  // Prefer cookie token (requires cookie-parser to be registered)
  const cookieToken = req.cookies && req.cookies.token;

  // Fallback to Authorization header for backward compatibility
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.phone || !ALLOWED_PHONES.includes(String(decoded.phone).trim())) {
      return res.status(401).json({ error: 'Phone not allowed' });
    }

    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
