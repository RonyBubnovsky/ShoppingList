const { parseItemText } = require('../services/geminiService');
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

/**
 * Parse a free text item description and add it to the shopping list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const parseAndAddItem = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Parse the free text using Gemini API
    const parsedItem = await parseItemText(text);
    
    // Extract the parsed data
    const { name, quantity, unit, category } = parsedItem;
    const parsedQuantity = parseInt(quantity);
    
    // Try with Prisma first
    try {
      // Check if same item already exists (same name, unit and category)
      const existingItem = await prisma.item.findFirst({
        where: {
          name: name,
          unit: unit,
          category: category,
        }
      });
      
      // If item exists, update quantity instead of creating new one
      if (existingItem) {
        const updatedItem = await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + parsedQuantity
          }
        });
        
        return res.status(200).json({
          ...updatedItem,
          parsed: parsedItem,
          originalText: text
        });
      }
      
      // Item doesn't exist, create new one
      const newItem = await prisma.item.create({
        data: {
          name,
          quantity: parsedQuantity,
          unit,
          category,
          purchased: false,
        },
      });
      
      return res.status(201).json({
        ...newItem,
        parsed: parsedItem,
        originalText: text
      });
    } catch (prismaError) {
      console.error('Prisma error, falling back to SQLite:', prismaError);
      
      // Fallback to direct SQLite
      try {
        // Check if same item already exists
        const existingItems = await runQuery(
          `SELECT * FROM Item WHERE name = ? AND unit = ? AND category = ?`,
          [name, unit, category]
        );
        
        if (existingItems && existingItems.length > 0) {
          // Item exists, update quantity
          const existingItem = existingItems[0];
          const newQuantity = existingItem.quantity + parsedQuantity;
          
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE Item SET quantity = ? WHERE id = ?`,
              [newQuantity, existingItem.id],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
          
          // Get updated item
          const updatedItems = await runQuery(
            `SELECT * FROM Item WHERE id = ?`,
            [existingItem.id]
          );
          
          return res.status(200).json({
            ...updatedItems[0],
            parsed: parsedItem,
            originalText: text
          });
        } else {
          // Item doesn't exist, create new one
          const result = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO Item (name, quantity, unit, category, purchased) 
               VALUES (?, ?, ?, ?, ?)`,
              [name, parsedQuantity, unit, category, false],
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
          
          return res.status(201).json({
            ...result,
            parsed: parsedItem,
            originalText: text
          });
        }
      } catch (sqliteError) {
        throw sqliteError;
      }
    }
  } catch (error) {
    console.error('Error parsing and creating/updating item:', error);
    res.status(500).json({ error: `Failed to parse and add item: ${error.message}` });
  }
};

/**
 * Just parse a free text item description without adding it to the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const parseItemOnly = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Parse the free text using Gemini API
    const parsedItem = await parseItemText(text);
    
    return res.status(200).json({
      parsed: parsedItem,
      originalText: text
    });
    
  } catch (error) {
    console.error('Error parsing item text:', error);
    res.status(500).json({ error: `Failed to parse item text: ${error.message}` });
  }
};

module.exports = {
  setDatabase,
  parseAndAddItem,
  parseItemOnly
};
