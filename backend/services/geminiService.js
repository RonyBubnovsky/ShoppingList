const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Import the prompt template
const itemParsingPrompt = require('../prompts/itemParsingPrompt');

// Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Models to try in order (fallback sequence)
const MODEL_OPTIONS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-pro-preview-03-25",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b",
  "gemma-3-1b-it",
  "gemma-3-4b-it",
  "gemma-3-12b-it",
  "gemma-3-27b-it",
  "gemma-2-2b-it",
  "gemma-2-9b-it",
  "gemma-2-27b-it"
];

/**
 * Parse free-text shopping list using Gemini API
 * @param {string} text - The free-text shopping list or item
 * @returns {Promise<Array<Object>>} - Array of parsed items
 */
async function parseItemText(text) {
  try {
    console.log(`Trying to parse shopping text: "${text}"`);
    
    // Try each model in sequence until one works
    for (const modelName of MODEL_OPTIONS) {
      try {
        console.log(`Trying to parse with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
    
        // Combine the prompt template with the user's text
        const fullPrompt = `${itemParsingPrompt}\n\nInput: "${text}"`;
        
        // Generate content with the prompt
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const responseText = response.text().trim();
        
        console.log("Raw API response:", responseText);
        
        // Extract JSON array from the response text
        let jsonString = responseText;
        
        // Try to extract the JSON array from the response
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonString = arrayMatch[0];
          console.log("Extracted JSON array:", jsonString);
        } else {
          // If not found as array, try to extract a single object and wrap it
          const objectMatch = responseText.match(/{[\s\S]*?}/);
          if (objectMatch) {
            jsonString = `[${objectMatch[0]}]`;
            console.log("Extracted single JSON object and wrapped as array:", jsonString);
          }
        }
        
        // Parse the JSON
        const parsedItems = JSON.parse(jsonString);
        
        // Validate and apply defaults to each item
        const allowedUnits = ["יחידה", "ק״ג", "גרם", "ליטר", "מ״ל", "חבילה", "בקבוק", "קופסה", "זוג"];
        const allowedCategories = ["Dairy", "Meat", "Fish", "Produce", "Bakery", "Frozen", "Beverages", "Snacks", "Sweets", "Canned Goods", "Household", "Personal Care", "Grains"];
        
        const validatedItems = parsedItems.map(item => {
          // Apply defaults and validate
          if (!item.quantity || isNaN(item.quantity)) item.quantity = 1;
          
          // Ensure unit is from our allowed list
          if (!item.unit || !allowedUnits.includes(item.unit)) {
            console.log(`Unit '${item.unit}' not in allowed list, defaulting to 'יחידה'`);
            item.unit = "יחידה";
          }
          
          // Ensure category is valid
          if (!item.category || !allowedCategories.includes(item.category)) {
            console.log(`Category '${item.category}' not in allowed list, defaulting to 'Produce'`);
            item.category = "Produce";
          }
          
          return item;
        });
        
        console.log(`Successfully parsed ${validatedItems.length} items with model ${modelName}`);
        return validatedItems;
      } catch (error) {
        // If this model fails, log the error and try the next one
        console.error(`Error with model ${modelName}: ${error.message}`);
        // Continue to next model
      }
    }
    
    // If we get here, all models failed, fall back to local parser
    console.log("All models failed, falling back to local parsing");
  } catch (error) {
    console.error("API error:", error.message);
    
    // If API fails, use the local parser as fallback
    return parseLocalWithFallback(text);
  }
}

/**
 * Parse a shopping list locally when API fails
 * @param {string} text - The shopping list text
 * @returns {Array<Object>} - Array of parsed items
 */
function parseLocalWithFallback(text) {
  console.log("Using local parser for shopping list:", text);
  
  // First, split the text into individual items
  const itemTexts = splitShoppingList(text);
  console.log(`Split into ${itemTexts.length} items:`, itemTexts);
  
  // Parse each item individually and return an array
  return itemTexts.map(itemText => simpleLocalParser(itemText));
}

/**
 * Split shopping list text into individual items
 * @param {string} text - The shopping list text
 * @returns {Array<string>} - Array of item texts
 */
function splitShoppingList(text) {
  // If the text is empty or undefined, return empty array
  if (!text || !text.trim()) {
    return [];
  }
  
  // First try to split by new lines
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  // If we got multiple lines, return them
  if (lines.length > 1) {
    return lines;
  }
  
  // Otherwise, try to split by commas or semicolons
  const items = text.split(/[,;]/).filter(item => item.trim().length > 0);
  return items;
}

/**
 * Simple local parser for a single item when API fails
 * @param {string} text - The text to parse
 * @returns {Object} - Structured item data
 */
function simpleLocalParser(text) {
  console.log("Using local parser for item:", text);
  
  // Default values
  const result = {
    name: "",
    quantity: 1,
    unit: "יחידה",
    category: "Produce" // Default to produce as it's common
  };
  
  // Clean up input
  const input = text.trim();
  
  // Extract quantity
  const quantityMatch = input.match(/\d+(\.\d+)?/);
  if (quantityMatch) {
    result.quantity = parseFloat(quantityMatch[0]);
    // Remove the quantity from the text for further processing
    const beforeQuantity = input.substring(0, quantityMatch.index).trim();
    const afterQuantity = input.substring(quantityMatch.index + quantityMatch[0].length).trim();
    
    // Check where the quantity was - at the start or in the middle/end
    if (beforeQuantity.length === 0) {
      // Quantity was at the start, so the rest is probably the item name
      result.name = afterQuantity;
    } else {
      // Quantity was in the middle or end, first part is probably the item name
      result.name = beforeQuantity;
    }
  } else {
    // No quantity found, assume the whole text is the item name
    result.name = input;
  }
  
  // Extract unit if present (standardized list of units)
  const unitMap = {
    // Weight units
    'קילו': 'ק״ג',
    'קילוגרם': 'ק״ג',
    'ק״ג': 'ק״ג',
    'קג': 'ק״ג',
    'kg': 'ק״ג',
    'גרם': 'גרם',
    'gram': 'גרם',
    'g': 'גרם',
    // Volume units
    'ליטר': 'ליטר',
    'liter': 'ליטר',
    'l': 'ליטר',
    'מיליליטר': 'מ״ל',
    'מ״ל': 'מ״ל',
    'ml': 'מ״ל',
    // Package units
    'חבילה': 'חבילה',
    'חבילות': 'חבילה',
    'package': 'חבילה',
    'pack': 'חבילה',
    'חפיסה': 'חבילה',
    'חפיסות': 'חבילה',
    // Bottle units
    'בקבוק': 'בקבוק',
    'בקבוקים': 'בקבוק',
    'bottle': 'בקבוק',
    'bottles': 'בקבוק',
    // Box units
    'קופסה': 'קופסה',
    'קופסאות': 'קופסה',
    'box': 'קופסה',
    'boxes': 'קופסה',
    // Pair units
    'זוג': 'זוג',
    'זוגות': 'זוג',
    'pair': 'זוג',
    'pairs': 'זוג',
    // Piece/unit (default)
    'יחידה': 'יחידה',
    'יחידות': 'יחידה',
    'חתיכה': 'יחידה',
    'חתיכות': 'יחידה',
    'פרוסה': 'יחידה',
    'פרוסות': 'יחידה',
    'פיסה': 'יחידה',
    'פיסות': 'יחידה',
    'piece': 'יחידה',
    'pieces': 'יחידה',
    'unit': 'יחידה',
    'units': 'יחידה'
  };
  
  // Check for unit words in the text
  for (const [unitWord, standardUnit] of Object.entries(unitMap)) {
    if (input.includes(unitWord)) {
      result.unit = standardUnit;
      // If the unit was found, remove it from the name if it's there
      result.name = result.name.replace(unitWord, '').trim();
      break;
    }
  }
  
  // Try to determine category based on common items
  const categoryMap = {
    // Dairy products
    'חלב': 'Dairy',
    'גבינה': 'Dairy',
    'יוגורט': 'Dairy',
    'milk': 'Dairy',
    'cheese': 'Dairy',
    'yogurt': 'Dairy',
    
    // Meat
    'בשר': 'Meat',
    'עוף': 'Meat',
    'הודו': 'Meat',
    'beef': 'Meat',
    'chicken': 'Meat',
    
    // Produce
    'עגבנ': 'Produce', // Matches עגבניות and similar
    'מלפפון': 'Produce',
    'תפוח': 'Produce',
    'בננה': 'Produce',
    'ירק': 'Produce',
    'פרי': 'Produce',
    'tomato': 'Produce',
    'cucumber': 'Produce',
    'apple': 'Produce',
    'banana': 'Produce',
    
    // Grains
    'אורז': 'Grains',
    'פסטה': 'Grains',
    'לחם': 'Bakery',
    'rice': 'Grains',
    'pasta': 'Grains',
    'bread': 'Bakery',
    
    // Beverages
    'מים': 'Beverages',
    'משקה': 'Beverages',
    'מיץ': 'Beverages',
    'water': 'Beverages',
    'juice': 'Beverages',
    'drink': 'Beverages',
    
    // Sweets
    'שוקולד': 'Sweets',
    'ממתק': 'Sweets',
    'chocolate': 'Sweets',
    'candy': 'Sweets',
    
    // Additional categories
    'ביצים': 'Dairy',
    'eggs': 'Dairy'
  };
  
  // Try to determine category
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (input.toLowerCase().includes(keyword)) {
      result.category = category;
      break;
    }
  }
  
  // Final cleanup - make sure name is not empty
  if (!result.name.trim()) {
    // If name is empty after all our parsing, use the original input
    result.name = input;
  }
  
  // Make sure name is trimmed
  result.name = result.name.trim();
  
  return result;
}

module.exports = {
  parseItemText
};