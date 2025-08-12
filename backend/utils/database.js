const mongoose = require('mongoose');

// Maintain a cached connection across serverless invocations
let cached = global.mongooseConnectionCache;
if (!cached) {
  cached = global.mongooseConnectionCache = { conn: null, promise: null };
}

// Connect to MongoDB (resilient for serverless cold starts)
const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not set');
      return null;
    }

    cached.promise = mongoose
      .connect(mongoUri)
      .then((mongooseInstance) => {
        console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset promise so future calls can retry
        cached.promise = null;
        console.error(`Error connecting to MongoDB: ${error.message}`);
        return null;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

// Handle graceful shutdown (only meaningful in long-lived processes)
const gracefulShutdown = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    }
  } catch (e) {
    console.error('Error during graceful shutdown:', e);
  }
};

module.exports = {
  connectDB,
  gracefulShutdown,
};
