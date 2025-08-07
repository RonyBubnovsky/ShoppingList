// setup-render.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create production.db if it doesn't exist
const dbPath = path.join(__dirname, 'prisma', 'production.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  console.log(`Creating directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  console.log(`Creating empty database file: ${dbPath}`);
  fs.writeFileSync(dbPath, '');
}

console.log('Running Prisma migrations...');

try {
  // Set DATABASE_URL for production
  process.env.DATABASE_URL = `file:${dbPath}`;
  
  // Generate Prisma client
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('Database setup completed successfully');
} catch (error) {
  console.error('Error setting up database:', error);
  process.exit(1);
}
