const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

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

  const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
});

module.exports = router;
