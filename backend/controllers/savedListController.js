const SavedList = require('../models/SavedList');
const Item = require('../models/Item');

/**
 * Get all saved lists
 * @route GET /api/saved-lists
 */
const getAllSavedLists = async (req, res) => {
  try {
    const savedLists = await SavedList.find().sort({ createdAt: -1 });
    res.json(savedLists);
  } catch (error) {
    console.error('Error fetching saved lists:', error);
    res.status(500).json({ error: 'Failed to fetch saved lists' });
  }
};

/**
 * Get a saved list by ID
 * @route GET /api/saved-lists/:id
 */
const getSavedListById = async (req, res) => {
  try {
    const listId = req.params.id;
    const savedList = await SavedList.findById(listId).populate('items');
    
    if (!savedList) {
      return res.status(404).json({ error: 'Saved list not found' });
    }
    
    res.json(savedList);
  } catch (error) {
    console.error('Error fetching saved list:', error);
    res.status(500).json({ error: 'Failed to fetch saved list' });
  }
};

/**
 * Create a new saved list
 * @route POST /api/saved-lists
 */
const createSavedList = async (req, res) => {
  try {
    const { name, itemIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }
    
    let items = [];
    
    // If specific itemIds were provided, use those
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      items = itemIds;
    } else {
      // Otherwise get all current non-purchased items
      const currentItems = await Item.find({ purchased: false });
      items = currentItems.map(item => item._id);
    }
    
    if (items.length === 0) {
      return res.status(400).json({ error: 'No items available to save' });
    }
    
    const newSavedList = new SavedList({
      name,
      items
    });
    
    const savedList = await newSavedList.save();
    res.status(201).json(savedList);
  } catch (error) {
    console.error('Error creating saved list:', error);
    res.status(500).json({ error: 'Failed to create saved list' });
  }
};

/**
 * Delete a saved list
 * @route DELETE /api/saved-lists/:id
 */
const deleteSavedList = async (req, res) => {
  try {
    const listId = req.params.id;
    const deletedList = await SavedList.findByIdAndDelete(listId);
    
    if (!deletedList) {
      return res.status(404).json({ error: 'Saved list not found' });
    }
    
    res.json({ message: 'Saved list deleted', id: listId });
  } catch (error) {
    console.error('Error deleting saved list:', error);
    res.status(500).json({ error: 'Failed to delete saved list' });
  }
};

/**
 * Apply a saved list to the current shopping list
 * @route POST /api/saved-lists/:id/apply
 */
const applySavedList = async (req, res) => {
  try {
    const listId = req.params.id;
    const savedList = await SavedList.findById(listId).populate('items');
    
    if (!savedList) {
      return res.status(404).json({ error: 'Saved list not found' });
    }
    
    console.log(`Applying saved list ${savedList.name} with ${savedList.items.length} items`);
    
    // Instead of creating new items, just return the existing items from the saved list
    // This prevents duplicates in the items collection
    const items = savedList.items;
    
    // Calculate statistics for this list
    const totalItems = savedList.items.length;
    const purchasedItems = savedList.items.filter(item => item.purchased).length;
    const unpurchasedItems = totalItems - purchasedItems;
    
    // Log the items being returned
    console.log(`Returning ${items.length} items from saved list`);
    console.log(`List statistics: total=${totalItems}, purchased=${purchasedItems}, unpurchased=${unpurchasedItems}`);
    
    res.json({
      message: `Applied ${items.length} items from saved list`,
      items: items,
      listId: savedList._id,
      listName: savedList.name,
      stats: {
        total: totalItems,
        purchased: purchasedItems,
        unpurchased: unpurchasedItems
      }
    });
  } catch (error) {
    console.error('Error applying saved list:', error);
    res.status(500).json({ error: 'Failed to apply saved list' });
  }
};

/**
 * Update an existing saved list
 * @route PUT /api/saved-lists/:id
 */
const updateSavedList = async (req, res) => {
  try {
    const listId = req.params.id;
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }
    
    // Find the list to update
    const savedList = await SavedList.findById(listId);
    
    if (!savedList) {
      return res.status(404).json({ error: 'Saved list not found' });
    }
    
    // Update the items array
    savedList.items = itemIds;
    
    // Save the updated list
    const updatedList = await savedList.save();
    
    res.json({
      message: 'Saved list updated successfully',
      list: updatedList
    });
  } catch (error) {
    console.error('Error updating saved list:', error);
    res.status(500).json({ error: 'Failed to update saved list' });
  }
};

/**
 * Get statistics for a saved list
 * @route GET /api/saved-lists/:id/stats
 */
const getSavedListStats = async (req, res) => {
  try {
    const listId = req.params.id;
    const savedList = await SavedList.findById(listId).populate('items');
    
    if (!savedList) {
      return res.status(404).json({ error: 'Saved list not found' });
    }
    
    // Calculate statistics for this list
    const totalItems = savedList.items.length;
    const purchasedItems = savedList.items.filter(item => item.purchased).length;
    const unpurchasedItems = totalItems - purchasedItems;
    
    console.log(`Stats for saved list ${savedList.name}: total=${totalItems}, purchased=${purchasedItems}, unpurchased=${unpurchasedItems}`);
    
    res.json({
      total: totalItems,
      purchased: purchasedItems,
      unpurchased: unpurchasedItems,
      listId: savedList._id,
      listName: savedList.name
    });
  } catch (error) {
    console.error('Error fetching saved list statistics:', error);
    res.status(500).json({ error: 'Failed to fetch saved list statistics' });
  }
};

module.exports = {
  getAllSavedLists,
  getSavedListById,
  createSavedList,
  deleteSavedList,
  applySavedList,
  updateSavedList,
  getSavedListStats
};
