const mongoose = require('mongoose');

const savedListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SavedList', savedListSchema);
