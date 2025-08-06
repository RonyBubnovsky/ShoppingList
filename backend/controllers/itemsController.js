const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['error'],
});

// SQLite database instance will be passed from index.js
let db;

// Set the SQLite database instance
const setDatabase = (database) => {
  db = database;
};

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
const getAllItems = async (req, res) => {
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
};

// Add a new item
const addItem = async (req, res) => {
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
};

// Delete a single item
const deleteItem = async (req, res) => {
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
};

// Mark item as purchased
const toggleItemPurchased = async (req, res) => {
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
};

// Delete multiple items
const deleteMultipleItems = async (req, res) => {
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
};

// Mark multiple items as purchased
const toggleMultipleItemsPurchased = async (req, res) => {
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
};

// Get item statistics
const getItemStats = async (req, res) => {
  try {
    // Try with Prisma first
    try {
      const totalItems = await prisma.item.count();
      const purchasedItems = await prisma.item.count({
        where: { purchased: true }
      });
      const unpurchasedItems = totalItems - purchasedItems;
      
      return res.json({
        total: totalItems,
        purchased: purchasedItems,
        unpurchased: unpurchasedItems
      });
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      const totalResult = await runQuery('SELECT COUNT(*) as total FROM Item');
      const total = totalResult[0].total;
      
      const purchasedResult = await runQuery('SELECT COUNT(*) as purchased FROM Item WHERE purchased = 1');
      const purchased = purchasedResult[0].purchased;
      
      const unpurchased = total - purchased;
      
      return res.json({
        total,
        purchased,
        unpurchased
      });
    }
  } catch (error) {
    console.error('Error fetching item stats:', error);
    res.status(500).json({ error: 'Failed to fetch item statistics' });
  }
};

module.exports = {
  setDatabase,
  getAllItems,
  addItem,
  deleteItem,
  toggleItemPurchased,
  deleteMultipleItems,
  toggleMultipleItemsPurchased,
  getItemStats
};
