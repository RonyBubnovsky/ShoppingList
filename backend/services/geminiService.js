const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// No longer need to import the prompt file
// const itemParsingPrompt = require('../prompts/itemParsingPrompt');

// Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Use the most reliable model
const MODEL_NAME = "gemini-2.0-flash";

/**
 * Parse a free-text item description using Gemini API
 * @param {string} text - The free-text item description
 * @returns {Promise<Object>} - Parsed item data
 */
async function parseItemText(text) {
  try {
    console.log(`Trying to parse text: "${text}"`);
    
    // Build the prompt
    const prompt = `
    Parse this shopping item description into a JSON object with these fields:
    - name: the item name in Hebrew
    - quantity: a number (default to 1 if not specified)
    - unit: the unit in Hebrew - MUST be one of these exact values: יחידה, ק״ג, גרם, ליטר, מ״ל, חבילה, בקבוק, קופסה, זוג (default to יחידה if uncertain)
    - category: one of these English categories: Dairy, Meat, Fish, Produce, Bakery, Frozen, Beverages, Snacks, Sweets, Canned Goods, Household, Personal Care, Grains

    You MUST map any non-standard units to the closest standard unit from the list above.
    For example, "חתיכות", "פיסות", "פרוסות", etc. should all be mapped to "יחידה".
    "בקבוקים" should be mapped to "בקבוק".
    "קופסאות" should be mapped to "קופסה".

    For example:
    If input is "חלב 2 ליטר", output: {"name":"חלב","quantity":2,"unit":"ליטר","category":"Dairy"}
    If input is "5 תפוחים", output: {"name":"תפוחים","quantity":5,"unit":"יחידה","category":"Produce"}
    If input is "עגבניות 3 ק״ג", output: {"name":"עגבניות","quantity":3,"unit":"ק״ג","category":"Produce"}
    If input is "שוקולד 3 חתיכות", output: {"name":"שוקולד","quantity":3,"unit":"יחידה","category":"Sweets"}
    If input is "קולה 6 בקבוקים", output: {"name":"קולה","quantity":6,"unit":"בקבוק","category":"Beverages"}

    Now parse: "${text}"
    `;

    // Get the model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Generate content with the prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    console.log("Raw API response:", responseText);
    
    // Extract JSON object from the response text
    let jsonString = responseText;
    
    // If the response includes explanation text, try to extract just the JSON part
    const jsonMatch = responseText.match(/{[\s\S]*?}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
      console.log("Extracted JSON:", jsonString);
    }
    
    // Parse the JSON
    const parsedData = JSON.parse(jsonString);
    
    // Apply defaults and validate unit against allowed list
    if (!parsedData.quantity) parsedData.quantity = 1;
    
    // Ensure unit is from our allowed list
    const allowedUnits = ["יחידה", "ק״ג", "גרם", "ליטר", "מ״ל", "חבילה", "בקבוק", "קופסה", "זוג"];
    if (!parsedData.unit || !allowedUnits.includes(parsedData.unit)) {
      console.log(`Unit '${parsedData.unit}' not in allowed list, defaulting to 'יחידה'`);
      parsedData.unit = "יחידה";
    }
    
    if (!parsedData.category) parsedData.category = "Produce";
    
    return parsedData;
  } catch (error) {
    console.error("API error:", error.message);
    
    // If API fails, use the simple local parser as fallback
    return simpleLocalParser(text);
  }
}

/**
 * Simple local parser for basic text input when all models fail
 * @param {string} text - The text to parse
 * @returns {Object} - Structured item data
 */
function simpleLocalParser(text) {
  console.log("Using local parser for:", text);
  
  // Default values
  const result = {
    name: "",
    quantity: 1,
    unit: "יחידה",
    category: "Produce"
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