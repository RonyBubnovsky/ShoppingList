const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const itemRoutes = require('./routes/itemRoutes');
const parseRoutes = require('./routes/parseRoutes');
const imageService = require('./services/imageService');

// Initialize Prisma Client with logging
const prisma = new PrismaClient({
  log: ['error'],
});

// Determine the database path based on environment
const isProduction = process.env.NODE_ENV === 'production';
const dbFileName = isProduction ? 'production.db' : 'dev.db';
const dbPath = path.join(__dirname, 'prisma', dbFileName);
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`Using database at: ${dbPath}`);

// Ensure the database file exists
if (!fs.existsSync(dbPath)) {
  console.log(`Database file not found at ${dbPath}. Creating it.`);
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Try to create an empty file
  try {
    fs.writeFileSync(dbPath, '');
    console.log('Created empty database file');
    
    // Run migrations immediately if in production
    if (isProduction) {
      try {
        const { execSync } = require('child_process');
        console.log('Running database migrations...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('Migrations completed successfully');
      } catch (migrationErr) {
        console.error('Error running migrations:', migrationErr);
      }
    }
  } catch (err) {
    console.error('Error creating database file:', err);
  }
}

// Set up a direct SQLite connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database directly.');
    
    // Create the Item table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS Item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        purchased BOOLEAN NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating Item table:', err.message);
      } else {
        console.log('Item table created or already exists.');
      }
    });
  }
});

// Pass the database connection to the controllers
const itemsController = require('./controllers/itemsController');
const parseController = require('./controllers/parseController');
itemsController.setDatabase(db);
parseController.setDatabase(db);
imageService.setDatabase(db); // Also pass db to image service for cache fallback

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/parse', parseRoutes);

// Handle categories at the frontend level now
app.get('/api/categories', (req, res) => {
  res.status(410).json({ 
    message: 'Categories are now handled at the frontend level. Please update your application.' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error disconnecting Prisma:', e);
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing SQLite connection:', err);
    } else {
      console.log('SQLite connection closed.');
    }
    process.exit(0);
  });
});