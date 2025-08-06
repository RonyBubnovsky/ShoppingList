const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Initialize Prisma Client with logging
const prisma = new PrismaClient({
  log: ['error'],
});

// Set up correct path to the database
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log(`Using database at: ${dbPath}`);

// Ensure the database file exists
if (!fs.existsSync(dbPath)) {
  console.log(`Database file not found at ${dbPath}. Please run setup-db.js first.`);
  // Try to create an empty file
  try {
    fs.writeFileSync(dbPath, '');
    console.log('Created empty database file');
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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Define item categories with Hebrew translations
const CATEGORIES = [
  'Dairy',      // מוצרי חלב
  'Meat',       // בשר
  'Fish',       // דגים
  'Produce',    // ירקות ופירות
  'Bakery',     // מאפים
  'Frozen',     // קפואים
  'Beverages',  // משקאות
  'Snacks',     // חטיפים
  'Sweets',     // ממתקים
  'Canned Goods', // שימורים
  'Household',  // מוצרי בית
  'Personal Care', // טיפוח אישי
  'Grains',     // דגנים
];

// Get all categories
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// Helper function for SQLite queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Get all shopping list items
app.get('/api/items', async (req, res) => {
  try {
    // Try with Prisma first
    try {
      const items = await prisma.item.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
      return res.json(items);
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      const items = await runQuery(`
        SELECT id, name, quantity, unit, category, 
               purchased, createdAt 
        FROM Item 
        ORDER BY createdAt DESC
      `);
      
      return res.json(items);
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add a new item
app.post('/api/items', async (req, res) => {
  try {
    const { name, quantity, unit, category } = req.body;
    
    if (!name || !quantity || !unit || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Try with Prisma first
    try {
      const newItem = await prisma.item.create({
        data: {
          name,
          quantity: parseInt(quantity),
          unit,
          category,
          purchased: false,
        },
      });
      
      return res.status(201).json(newItem);
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      const result = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO Item (name, quantity, unit, category, purchased) 
           VALUES (?, ?, ?, ?, ?)`,
          [name, parseInt(quantity), unit, category, false],
          function(err) {
            if (err) {
              reject(err);
            } else {
              db.get(`SELECT * FROM Item WHERE id = ?`, [this.lastID], (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(row);
                }
              });
            }
          }
        );
      });
      
      return res.status(201).json(result);
    }
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Delete a single item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);
    
    try {
      await prisma.item.delete({
        where: { id: itemId },
      });
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM Item WHERE id = ?`, [itemId], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Mark item as purchased
app.patch('/api/items/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { purchased } = req.body;
    const itemId = parseInt(id);
    
    try {
      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: { purchased },
      });
      
      return res.json(updatedItem);
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Item SET purchased = ? WHERE id = ?`,
          [purchased ? 1 : 0, itemId],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
      
      const updatedItem = await runQuery(
        `SELECT * FROM Item WHERE id = ?`,
        [itemId]
      );
      
      return res.json(updatedItem[0]);
    }
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete multiple items
app.delete('/api/items', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    
    const itemIds = ids.map(id => parseInt(id));
    const placeholders = itemIds.map(() => '?').join(',');
    
    try {
      await prisma.item.deleteMany({
        where: {
          id: { in: itemIds },
        },
      });
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      await new Promise((resolve, reject) => {
        db.run(
          `DELETE FROM Item WHERE id IN (${placeholders})`,
          itemIds,
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
    res.json({ message: 'Items deleted successfully' });
  } catch (error) {
    console.error('Error deleting items:', error);
    res.status(500).json({ error: 'Failed to delete items' });
  }
});

// Mark multiple items as purchased
app.patch('/api/items/purchase', async (req, res) => {
  try {
    const { ids, purchased } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    
    const itemIds = ids.map(id => parseInt(id));
    const placeholders = itemIds.map(() => '?').join(',');
    
    try {
      await prisma.item.updateMany({
        where: {
          id: { in: itemIds },
        },
        data: { purchased },
      });
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Item SET purchased = ? WHERE id IN (${placeholders})`,
          [purchased ? 1 : 0, ...itemIds],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(500).json({ error: 'Failed to update items' });
  }
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