const { parseItemText } = require('../services/geminiService');
const { getItemImage } = require('../services/imageService');
const Item = require('../models/Item');

/**
 * Parse a free text item description and add it to the shopping list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const parseAndAddItem = async (req, res) => {
  try {
    const { text, listContextId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Parse the free text using Gemini API - returns array of items
    const parsedItems = await parseItemText(text);
    
    // Process multiple items if needed
    if (parsedItems.length === 0) {
      return res.status(400).json({ error: 'Could not parse any items from the text' });
    }
    
    // If multiple items, process them sequentially
    const results = [];
    
    for (const parsedItem of parsedItems) {
      // Extract the parsed data for current item
      const { name, quantity, unit, category } = parsedItem;
      const parsedQuantity = parseInt(quantity);
      
      // Get image for the item
      const imageUrl = await getItemImage(name);
      
      try {
        // Check if same item already exists (same name, unit, category AND list context)
        const existingItemQuery = {
          name,
          unit,
          category
        };
        
        // Add list context to query if provided
        if (listContextId) {
          existingItemQuery.listContext = listContextId;
        } else {
          // For items without list context (current active shopping list)
          existingItemQuery.listContext = null;
        }
        
        const existingItem = await Item.findOne(existingItemQuery);
        
        // If item exists in the same list context, update quantity instead of creating new one
        if (existingItem) {
          existingItem.quantity += parsedQuantity;
          // Update image URL if we found one and there wasn't one already
          if (imageUrl && !existingItem.imageUrl) {
            existingItem.imageUrl = imageUrl;
          }
          
          const updatedItem = await existingItem.save();
          
          results.push({
            ...updatedItem.toObject(),
            parsed: parsedItem,
            action: "updated"
          });
        } else {
          // Item doesn't exist, create new one
          const newItem = new Item({
            name,
            quantity: parsedQuantity,
            unit,
            category,
            purchased: false,
            imageUrl,
            listContext: listContextId || null
          });
          
          const savedItem = await newItem.save();
          
          results.push({
            ...savedItem.toObject(),
            parsed: parsedItem,
            action: "created"
          });
        }
      } catch (error) {
        console.error('Error creating/updating item:', error);
        return res.status(500).json({ error: `Failed to create/update item: ${error.message}` });
      }
    }
    
    // Return success with all results
    return res.status(200).json({
      success: true,
      items: results,
      originalText: text,
      count: results.length
    });
    
  } catch (error) {
    console.error('Error parsing and creating/updating items:', error);
    res.status(500).json({ error: `Failed to parse and add items: ${error.message}` });
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
    
    // Parse the free text using Gemini API (returns array of items)
    const parsedItems = await parseItemText(text);
    
    return res.status(200).json({
      success: true,
      items: parsedItems,
      originalText: text,
      count: parsedItems.length
    });
    
  } catch (error) {
    console.error('Error parsing item text:', error);
    res.status(500).json({ error: `Failed to parse item text: ${error.message}` });
  }
};

module.exports = {
  parseAndAddItem,
  parseItemOnly
};