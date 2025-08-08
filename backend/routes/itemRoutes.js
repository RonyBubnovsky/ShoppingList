const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');

// Get all items
router.get('/', itemsController.getAllItems);

// Get item statistics (total, purchased, unpurchased)
router.get('/stats', itemsController.getItemStats);

// Get statistics for specific items by IDs
router.post('/stats/by-ids', itemsController.getItemStatsByIds);

// Get a single item by ID
router.get('/:id', itemsController.getItemById);

// Add a new item
router.post('/', itemsController.addItem);

// Delete a single item
router.delete('/:id', itemsController.deleteItem);

// Toggle purchased status of an item
router.patch('/:id/purchase', itemsController.toggleItemPurchased);

// Delete multiple items
router.delete('/', itemsController.deleteMultipleItems);

// Toggle purchased status for multiple items
router.patch('/purchase', itemsController.toggleMultipleItemsPurchased);

module.exports = router;
