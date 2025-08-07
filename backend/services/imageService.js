const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize Prisma, but prepare for fallback to SQLite if needed
let prisma;
try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
}

const PEXELS_API_KEY = process.env.PEXELS_API;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client for translation
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// SQLite database instance will be passed from index.js
let db;

// Set the SQLite database instance
const setDatabase = (database) => {
  db = database;
  
  // Ensure the ImageCache table exists in SQLite
  if (db) {
    db.run(`
      CREATE TABLE IF NOT EXISTS ImageCache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemName TEXT UNIQUE,
        imageUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating ImageCache table:', err);
      } else {
        console.log('ImageCache table ready');
      }
    });
  }
};

/**
 * Gets an image for an item by name
 * First checks the cache, and if not found there, searches in Pexels
 */
async function getItemImage(itemName) {
  // Normalize item name - remove extra spaces and punctuation
  const normalizedName = itemName.trim().toLowerCase();
  
  try {
    // Try with Prisma first
    if (prisma) {
      try {
        // Check if image exists in cache using Prisma
        const cachedImage = await prisma.imageCache.findUnique({
          where: {
            itemName: normalizedName,
          },
        });
        
        // If found in cache, return it
        if (cachedImage) {
          console.log(`Found cached image for: ${normalizedName}`);
          return cachedImage.imageUrl;
        }
      } catch (prismaError) {
        console.error('Prisma error, falling back to SQLite for image cache:', prismaError);
        // Continue with SQLite fallback below
      }
    }

    // Fallback to direct SQLite if Prisma failed or not available
    if (db) {
      try {
        // Check if image exists in cache using SQLite
        const cachedImage = await new Promise((resolve, reject) => {
          db.get(
            `SELECT imageUrl FROM ImageCache WHERE itemName = ?`,
            [normalizedName],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        // If found in SQLite cache, return it
        if (cachedImage) {
          console.log(`Found cached image in SQLite for: ${normalizedName}`);
          return cachedImage.imageUrl;
        }
      } catch (sqliteError) {
        console.error('SQLite error when checking image cache:', sqliteError);
      }
    }
    
    // If not found in any cache, search Pexels
    console.log(`Searching Pexels for: ${normalizedName}`);
    const imageUrl = await searchPexelsImage(normalizedName);
    
    if (imageUrl) {
      // Try to save to cache - first with Prisma, then fallback to SQLite
      try {
        // Try with Prisma first
        if (prisma) {
          try {
            await prisma.imageCache.create({
              data: {
                itemName: normalizedName,
                imageUrl,
              },
            });
            console.log(`Saved image to Prisma cache: ${normalizedName}`);
          } catch (prismaError) {
            console.error('Prisma error when saving to cache, trying SQLite:', prismaError);
            throw prismaError; // Continue to SQLite fallback
          }
        } else {
          throw new Error('Prisma not available'); // Continue to SQLite fallback
        }
      } catch (error) {
        // Fallback to SQLite for saving
        if (db) {
          try {
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO ImageCache (itemName, imageUrl) VALUES (?, ?)`,
                [normalizedName, imageUrl],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            console.log(`Saved image to SQLite cache: ${normalizedName}`);
          } catch (sqliteError) {
            console.error('Error saving to SQLite cache:', sqliteError);
          }
        }
      }
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Search for an image using Pexels API
 */
async function searchPexelsImage(query) {
  // If no API key, return null
  if (!PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY not found in environment variables');
    return null;
  }
  
  try {
    // Translate query to English for better results
    const translatedQuery = await translateToEnglish(query);
    
    // If translation succeeded, use it, otherwise use original query
    let searchQuery = translatedQuery || query;
    
    // Use only the exact product name as requested by the user
    console.log(`Final Pexels search query: "${searchQuery}"`);
    
    // Send request to Pexels
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if results were received
    if (data.photos && data.photos.length > 0) {
      // Choose medium-sized image URL to save bandwidth
      const imageUrl = data.photos[0].src.medium;
      console.log(`Found image for "${query}" at ${imageUrl}`);
      return imageUrl;
    } else {
      console.log(`No images found for "${query}"`);
      
      // Try a second search just with the translated word if different from original
      if (translatedQuery && translatedQuery !== query) {
        console.log(`Trying second search with just "${translatedQuery}"`);
        const secondResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(translatedQuery)}&per_page=1`,
          {
            headers: {
              'Authorization': PEXELS_API_KEY,
            },
          }
        );
        
        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          if (secondData.photos && secondData.photos.length > 0) {
            const imageUrl = secondData.photos[0].src.medium;
            console.log(`Found image in second attempt at ${imageUrl}`);
            return imageUrl;
          }
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error searching Pexels:', error);
    return null;
  }
}

/**
 * Translate item name from Hebrew to English for better image search results
 * Uses Gemini API for quick translation
 */
async function translateToEnglish(hebrewText) {
  // If name is already in English, return it as is
  if (/^[A-Za-z\s]+$/.test(hebrewText)) {
    console.log(`Text "${hebrewText}" is already in English, skipping translation`);
    return hebrewText;
  }
  
  try {
    console.log(`Translating "${hebrewText}" to English`);
    
    // Select model for translation - using the fastest model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Use a simple prompt for translation
    const translationPrompt = `Translate this product name from Hebrew to English. Respond with only the English translation, nothing else.
    
Hebrew: "${hebrewText}"
English:`;
    
    // Send translation request
    const result = await model.generateContent(translationPrompt);
    const response = await result.response;
    let translatedText = response.text().trim();
    
    // Clean result from extra characters and quotes
    translatedText = translatedText.replace(/^['"`]|['"`]$/g, '');
    
    console.log(`Translated "${hebrewText}" to "${translatedText}"`);
    return translatedText;
    
  } catch (error) {
    console.error(`Translation error: ${error.message}`);
    // In case of error, return the original text
    return hebrewText;
  }
}

module.exports = {
  getItemImage,
  setDatabase,
};
