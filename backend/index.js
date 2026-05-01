const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path'); // kept as in your original file
require('dotenv').config();

const itemRoutes = require('./routes/itemRoutes');
const parseRoutes = require('./routes/parseRoutes');
const savedListRoutes = require('./routes/savedListRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');
const { connectDB, gracefulShutdown } = require('./utils/database');

// Connect to the database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const CORS_HEADERS = 'Content-Type,Authorization';

// Normalize origins to avoid mismatches from trailing slashes in env values.
const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '');

// Middleware
const rawOrigins = process.env.FRONTEND_URL || '';
const envOrigins = rawOrigins
  .split(',')
  .map((s) => normalizeOrigin(s))
  .filter(Boolean);
const allowedOrigins = [
  // sensible defaults for local and production
  'http://localhost:5173',
  'https://reshimatkniot.vercel.app',
  ...envOrigins,
].map((s) => normalizeOrigin(s));
const allowedOriginsSet = new Set(allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server and curl
    if (allowedOriginsSet.has(normalizeOrigin(origin))) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Allow Authorization header and cookies for credentialed requests
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // required for httpOnly cookies to be sent by browser
};

// Disable ETag/304 for API responses to avoid proxy/cdn revalidation edge cases
// where credential CORS headers may be omitted on 304 responses.
app.disable('etag');

// Defensive CORS header middleware for all API routes.
// Keeps credential CORS headers present even when platform/proxy behavior changes.
app.use('/api', (req, res, next) => {
  const origin = normalizeOrigin(req.headers.origin);
  const isAllowedOrigin = origin && allowedOriginsSet.has(origin);

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);

  // Avoid caching auth-sensitive API responses and eliminate stale 304 behavior.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

// Enable CORS with credentials and parse cookies.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
// Parse cookies into `req.cookies` (used by auth middleware)
app.use(cookieParser());

// Ensure DB is connected before handling requests (skip for health and preflight)
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (req.path === '/api/health') return next();

  const conn = await connectDB();
  if (!conn) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  return next();
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Protected routes — require valid JWT
app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/parse', authMiddleware, parseRoutes);
app.use('/api/saved-lists', authMiddleware, savedListRoutes);


// Local development server only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel serverless function handler
module.exports = app;

// Handle graceful shutdown (mainly relevant for local dev / long-lived processes)
process.on('SIGINT', gracefulShutdown);
