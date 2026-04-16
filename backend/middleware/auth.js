const jwt = require('jsonwebtoken');

const ALLOWED_PHONES = [
  process.env.PHONE1,
  process.env.PHONE2,
  process.env.PHONE3,
].filter(Boolean);

/**
 * Middleware: verify JWT from Authorization header.
 * Attaches decoded payload to req.user on success.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

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
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
