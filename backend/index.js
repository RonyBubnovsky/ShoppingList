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
app.use(cors());
app.use(express.json());

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
