const express = require('express');
const router = express.Router();
const savedListController = require('../controllers/savedListController');

// Get all saved lists
router.get('/', savedListController.getAllSavedLists);

// Get statistics for all saved lists
router.get('/stats/all', savedListController.getAllSavedListsStats);

// Get a saved list by ID
router.get('/:id', savedListController.getSavedListById);

// Get statistics for a saved list
router.get('/:id/stats', savedListController.getSavedListStats);

// Create a new saved list
router.post('/', savedListController.createSavedList);

// Delete a saved list
router.delete('/:id', savedListController.deleteSavedList);

// Apply a saved list to current shopping list
router.post('/:id/apply', savedListController.applySavedList);

// Update an existing saved list
router.put('/:id', savedListController.updateSavedList);

module.exports = router;
