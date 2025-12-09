const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  try {
    if (!process.env.REDIS_URL) {
      console.warn('REDIS_URL is not defined in environment variables. Redis connection skipped.');
      return null;
    }

    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.warn('Redis connection retry limit reached. Continuing without Redis.');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // Don't queue commands when disconnected
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Ready');
    });

    redisClient.on('error', (err) => {
      // Only log errors, don't crash the server
      console.warn(`Redis Client Error: ${err.message}`);
    });

    redisClient.on('close', () => {
      console.warn('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    console.warn(`Warning: Could not initialize Redis: ${error.message}`);
    console.warn('Server will continue without Redis connection.');
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = connectRedis();
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };

