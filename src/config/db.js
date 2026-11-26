const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

const connectDB = async (uri = env.mongodbUri) => {
  mongoose.set('strictQuery', true);

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`MongoDB (in-memory) connected: ${conn.connection.host}/${conn.connection.name}`);
    return { conn, isInMemory: true };
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    if (env.nodeEnv !== 'test') {
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return { conn, isInMemory: false };
  } catch (error) {
    if (env.nodeEnv === 'development') {
      console.warn(
        `Local MongoDB unavailable (${error.message}). Falling back to in-memory MongoDB for development...`
      );
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`MongoDB (in-memory dev fallback) connected: ${conn.connection.host}/${conn.connection.name}`);
      return { conn, isInMemory: true };
    }

    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
