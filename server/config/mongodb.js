const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not defined in environment variables. MongoDB connection skipped.');
      return false;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`Warning: Could not connect to MongoDB: ${error.message}`);
    console.warn('Server will continue without MongoDB connection.');
    return false;
  }
};

module.exports = connectMongoDB;

