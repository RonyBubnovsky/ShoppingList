const mongoose = require('mongoose');

const imageCacheSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ImageCache', imageCacheSchema);
