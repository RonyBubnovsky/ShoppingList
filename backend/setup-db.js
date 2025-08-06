// Direct SQLite setup script to create the database tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure prisma directory exists
const prismaDir = path.join(__dirname, 'prisma');
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
  console.log('Created prisma directory');
}

// Create and connect to the database
// Note: Using the same path as specified in the .env file
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log(`Creating database at: ${dbPath}`);

// Ensure the file exists by writing to it if it doesn't exist
if (!fs.existsSync(dbPath)) {
  try {
    fs.writeFileSync(dbPath, ''); // Create an empty file
    console.log('Created empty database file');
  } catch (err) {
    console.error('Error creating database file:', err.message);
    process.exit(1);
  }
}

// Connect to the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Create the Item table
db.serialize(() => {
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
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database setup completed. Closed the database connection.');
      }
    });
  });
});