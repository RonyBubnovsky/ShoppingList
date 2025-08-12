const express = require('express');
const cors = require('cors');
const path = require('path'); // kept as in your original file
require('dotenv').config();

const itemRoutes = require('./routes/itemRoutes');
const parseRoutes = require('./routes/parseRoutes');
const savedListRoutes = require('./routes/savedListRoutes');
const { connectDB, gracefulShutdown } = require('./utils/database');

// Connect to the database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const rawOrigins = process.env.FRONTEND_URL || '';
const envOrigins = rawOrigins
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [
  // sensible defaults for local and production
  'http://localhost:5173',
  'https://reshimatkniot.vercel.app',
  ...envOrigins,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server and curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

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

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/saved-lists', savedListRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


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
