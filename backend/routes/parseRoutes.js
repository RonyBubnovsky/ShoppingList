const express = require('express');
const router = express.Router();
const parseController = require('../controllers/parseController');

// Parse and add an item to the shopping list
router.post('/add', parseController.parseAndAddItem);

// Just parse the text without adding to the database
router.post('/', parseController.parseItemOnly);

module.exports = router;
