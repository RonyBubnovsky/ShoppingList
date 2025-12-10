const { GoogleGenerativeAI } = require("@google/generative-ai");
const ImageCache = require('../models/ImageCache');
require('dotenv').config();

const PEXELS_API_KEY = process.env.PEXELS_API;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client for translation
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Gets an image for an item by name
 * First checks the cache, and if not found there, searches in Pexels
 */
async function getItemImage(itemName) {
  // Normalize item name - remove extra spaces and punctuation
  const normalizedName = itemName.trim().toLowerCase();
  
  try {
    // Check if image exists in cache
    const cachedImage = await ImageCache.findOne({
      itemName: normalizedName
    });
    
    // If found in cache, return it
    if (cachedImage) {
      console.log(`Found cached image for: ${normalizedName}`);
      return cachedImage.imageUrl;
    }
    
    // If not in cache, search Pexels
    console.log(`Searching Pexels for: ${normalizedName}`);
    const imageUrl = await searchPexelsImage(normalizedName);
    
    if (imageUrl) {
      // Save the image to cache for future use
      const newCacheEntry = new ImageCache({
        itemName: normalizedName,
        imageUrl
      });
      
      await newCacheEntry.save();
      console.log(`Saved image to cache: ${normalizedName}`);
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
  
  // Use a simple prompt for translation
  const translationPrompt = `Translate this product name from Hebrew to English. Respond with only the English translation, nothing else.
    
Hebrew: "${hebrewText}"
English:`;
  
  // Try with the lighter model first
  try {
    console.log(`[Translation] Attempting to translate "${hebrewText}" using gemini-2.5-flash-lite`);
    
    const liteModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await liteModel.generateContent(translationPrompt);
    const response = await result.response;
    let translatedText = response.text().trim();
    
    // Clean result from extra characters and quotes
    translatedText = translatedText.replace(/^['"`]|['"`]$/g, '');
    
    console.log(`[Translation] ✓ Successfully translated "${hebrewText}" to "${translatedText}" using gemini-2.5-flash-lite`);
    return translatedText;
    
  } catch (liteError) {
    console.warn(`[Translation] ✗ gemini-2.5-flash-lite failed: ${liteError.message}`);
    console.log(`[Translation] Attempting fallback to gemini-2.5-flash`);
    
    // Fallback to the full model
    try {
      const fullModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await fullModel.generateContent(translationPrompt);
      const response = await result.response;
      let translatedText = response.text().trim();
      
      // Clean result from extra characters and quotes
      translatedText = translatedText.replace(/^['"`]|['"`]$/g, '');
      
      console.log(`[Translation] ✓ Successfully translated "${hebrewText}" to "${translatedText}" using gemini-2.5-flash (fallback)`);
      return translatedText;
      
    } catch (fullError) {
      console.error(`[Translation] ✗ Both models failed. gemini-2.5-flash error: ${fullError.message}`);
      console.log(`[Translation] Returning original text: "${hebrewText}"`);
      // In case of error, return the original text
      return hebrewText;
    }
  }
}

module.exports = {
  getItemImage
};