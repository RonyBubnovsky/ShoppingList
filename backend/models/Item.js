const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unit: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  purchased: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', itemSchema);
