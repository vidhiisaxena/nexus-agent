const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const http = require('http');
const { Server } = require('socket.io');
const chatRoutes = require('./routes/chat');
const qrRoutes = require('./routes/qr');
const { initializeSocketManager } = require('./services/socketManager');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Apply middleware
// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store references for graceful shutdown
let redisClient = null;
let mongoConnected = false;

// Database Connections

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not defined. MongoDB connection skipped.');
      return false;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    mongoConnected = true;
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    mongoConnected = false;
    return false;
  }
}

/**
 * Create Redis client
 */
function connectRedis() {
  try {
    if (!process.env.REDIS_URL) {
      console.warn('REDIS_URL is not defined. Redis connection skipped.');
      return null;
    }

    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection retry limit reached.');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    redisClient.on('error', (err) => {
      console.warn(`Redis Client Error: ${err.message}`);
    });

    redisClient.on('close', () => {
      console.warn('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    console.warn(`Warning: Could not initialize Redis: ${error.message}`);
    return null;
  }
}

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mount routers
app.use('/api/chat', chatRoutes);
app.use('/api/qr', qrRoutes);

// Socket.io initialization
initializeSocketManager(io);
console.log('WebSocket server ready');

// Error Handling

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start Server

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Create Redis client
    connectRedis();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      if (mongoConnected) {
        console.log('MongoDB connected');
      }
      if (redisClient) {
        console.log('Redis connected');
      }
      console.log('WebSocket server ready');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown

async function gracefulShutdown(signal) {
  console.log(`${signal} signal received: closing server gracefully`);

  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Close MongoDB connection
  if (mongoConnected) {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  // Close Redis connection
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  // Exit process
  process.exit(0);
}

// Handle SIGTERM and SIGINT signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

// Export app for testing
module.exports = app;
