const Item = require('../models/Item');
const SavedList = require('../models/SavedList');

/**
 * Get all items
 * @route GET /api/items
 */
const getAllItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

/**
 * Add a new item
 * @route POST /api/items
 */
const addItem = async (req, res) => {
  try {
    const { name, quantity, unit, category } = req.body;
    
    if (!name || !quantity || !unit || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if same item already exists (same name, unit and category)
    const existingItem = await Item.findOne({
      name,
      unit,
      category
    });
    
    // If item exists, update quantity instead of creating new one
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
      await existingItem.save();
      return res.status(200).json(existingItem);
    }
    
    // Create new item
    const newItem = new Item({
      name,
      quantity: parseInt(quantity),
      unit,
      category,
      purchased: false
    });
    
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

/**
 * Helper function to check and delete empty saved lists
 */
/**
 * Helper function to check and update saved lists when items are deleted
 * This removes itemId from all saved lists and deletes empty lists
 */
const checkAndDeleteEmptySavedLists = async (itemId) => {
  try {
    // Find all saved lists that contain this item
    const savedLists = await SavedList.find({ items: itemId });
    console.log(`Found ${savedLists.length} saved lists containing item ${itemId}`);
    
    for (const list of savedLists) {
      // Remove the item from the list
      list.items = list.items.filter(item => item.toString() !== itemId.toString());
      
      // If the list is now empty, delete it
      if (list.items.length === 0) {
        await SavedList.findByIdAndDelete(list._id);
        console.log(`Deleted empty saved list: ${list._id}`);
      } else {
        // Otherwise save the updated list
        await list.save();
        console.log(`Updated saved list: ${list._id}, remaining items: ${list.items.length}`);
      }
    }
  } catch (error) {
    console.error('Error checking saved lists:', error);
  }
};

/**
 * Delete an item
 * @route DELETE /api/items/:id
 */
const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    const deletedItem = await Item.findByIdAndDelete(itemId);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check and delete empty saved lists
    await checkAndDeleteEmptySavedLists(itemId);
    
    res.json({ message: 'Item deleted', id: itemId });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

/**
 * Toggle item purchased status
 * @route PUT /api/items/:id/toggle
 */
const toggleItemPurchased = async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    item.purchased = !item.purchased;
    await item.save();
    
    res.json(item);
  } catch (error) {
    console.error('Error toggling item purchased status:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

/**
 * Delete multiple items
 * @route DELETE /api/items
 */
const deleteMultipleItems = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    const result = await Item.deleteMany({ _id: { $in: ids } });
    
    // Check and delete empty saved lists for each deleted item
    for (const itemId of ids) {
      await checkAndDeleteEmptySavedLists(itemId);
    }
    
    res.json({
      message: `${result.deletedCount} items deleted`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting multiple items:', error);
    res.status(500).json({ error: 'Failed to delete items' });
  }
};

/**
 * Toggle purchased status for multiple items
 * @route PUT /api/items/toggle
 */
const toggleMultipleItemsPurchased = async (req, res) => {
  try {
    const { ids, purchased } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    if (purchased === undefined) {
      return res.status(400).json({ error: 'Purchased status not provided' });
    }
    
    const result = await Item.updateMany(
      { _id: { $in: ids } },
      { $set: { purchased } }
    );
    
    res.json({
      message: `${result.modifiedCount} items updated`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error toggling multiple items purchased status:', error);
    res.status(500).json({ error: 'Failed to update items' });
  }
};

/**
 * Get item statistics
 * @route GET /api/items/stats
 */
const getItemStats = async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const purchasedItems = await Item.countDocuments({ purchased: true });
    const remainingItems = totalItems - purchasedItems;
    
    res.json({
      total: totalItems,
      purchased: purchasedItems,
      unpurchased: remainingItems
    });
  } catch (error) {
    console.error('Error fetching item statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * Get statistics for specific items by IDs
 * @route POST /api/items/stats/by-ids
 */
const getItemStatsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    // Find all items with the provided IDs
    const items = await Item.find({ _id: { $in: ids } });
    
    // Calculate statistics
    const totalItems = items.length;
    const purchasedItems = items.filter(item => item.purchased).length;
    const remainingItems = totalItems - purchasedItems;
    
    console.log(`Stats for ${ids.length} requested IDs: found ${totalItems} items, ${purchasedItems} purchased, ${remainingItems} remaining`);
    
    res.json({
      total: totalItems,
      purchased: purchasedItems,
      unpurchased: remainingItems
    });
  } catch (error) {
    console.error('Error fetching item statistics by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * Get a single item by ID
 * @route GET /api/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

module.exports = {
  getAllItems,
  addItem,
  deleteItem,
  toggleItemPurchased,
  deleteMultipleItems,
  toggleMultipleItemsPurchased,
  getItemStats,
  getItemStatsByIds,
  getItemById
};