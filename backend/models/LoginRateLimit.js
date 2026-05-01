const mongoose = require('mongoose');

const loginRateLimitSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attemptCount: {
    type: Number,
    required: true,
    default: 0,
  },
  windowStart: {
    type: Date,
    required: true,
  },
  blockedUntil: {
    type: Date,
    default: null,
  },
  // TTL cleanup so rate-limit documents do not grow forever.
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('LoginRateLimit', loginRateLimitSchema);
