const Session = require('../models/Session');
const Product = require('../models/Product');
const { parseUserMessage } = require('./contextEngine');
const { getRecommendations } = require('./recommendationEngine');
const { generateQR, validateQR, expireQR } = require('./qrService');
const { getRedisClient } = require('../config/redis');

// Redis client for storing socket connections
const redis = getRedisClient();
const SOCKET_KEY_PREFIX = 'socket:';
const MOBILE_PREFIX = `${SOCKET_KEY_PREFIX}mobile:`;
const KIOSK_PREFIX = `${SOCKET_KEY_PREFIX}kiosk:`;

// Store references to namespaces
let mobileNamespace = null;
let kioskNamespace = null;

/**
 * Get socket instance by userId from Redis
 * @param {string} userId - User ID
 * @param {string} namespace - 'mobile' or 'kiosk'
 * @returns {Promise<Socket|null>} Socket instance or null if not found
 */
async function getSocketByUserId(userId, namespace = 'mobile') {
  if (!redis || !mobileNamespace || !kioskNamespace || !userId) {
    return null;
  }

  const namespaceInstance = namespace === 'mobile' ? mobileNamespace : kioskNamespace;
  
  try {
    const key = namespace === 'mobile' 
      ? `${MOBILE_PREFIX}${userId}`
      : `${KIOSK_PREFIX}${userId}`;

    const socketId = await redis.get(key);
    
    if (!socketId) {
      return null;
    }

    const socket = namespaceInstance.sockets.get(socketId);
    return socket || null;
  } catch (error) {
    console.error('Error getting socket from Redis:', error);
    return null;
  }
}

/**
 * Broadcast event to all connected kiosks
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function broadcastToKiosks(event, data) {
  if (!kioskNamespace) {
    console.warn('Kiosk namespace not initialized');
    return;
  }

  kioskNamespace.emit(event, data);
}

/**
 * Cleanup expired QR codes (background job)
 * Runs every minute to check for expired QR codes
 */
async function cleanupExpiredQRs() {
  if (!redis) {
    return;
  }

  try {
    // Get all QR keys
    const keys = await redis.keys('qr:*');
    
    if (!keys || keys.length === 0) {
      return;
    }

    let cleaned = 0;
    for (const key of keys) {
      // Check TTL - if TTL is -1 or 0, it means expired or no TTL
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired QR codes`);
    }
  } catch (error) {
    console.error('Error cleaning up expired QR codes:', error);
  }
}

/**
 * Setup Mobile Namespace (/mobile)
 * @param {Namespace} namespace - Socket.io namespace instance
 */
function setupMobileNamespace(namespace) {
  mobileNamespace = namespace;

  namespace.on('connection', async (socket) => {
    console.log(`Mobile client connected: ${socket.id}`);

    // Welcome message
    socket.emit('mobile:welcome', {
      message: 'Connected to mobile namespace',
      socketId: socket.id,
    });

    // Handle mobile:message event
    socket.on('mobile:message', async (data) => {
      try {
        const { sessionId, userId, message } = data || {};

        // Validate input
        if (!sessionId || !userId || !message) {
          socket.emit('mobile:error', {
            message: 'sessionId, userId, and message are required',
          });
          return;
        }

        // Store socket mapping in Redis for this userId
        if (redis) {
          try {
            const key = `${MOBILE_PREFIX}${userId}`;
            await redis.set(key, socket.id);
          } catch (error) {
            console.error('Error storing socket mapping:', error);
          }
        }

        // Fetch or create session
        let session = await Session.findOne({ sessionId });
        if (!session) {
          session = new Session({
            sessionId,
            userId,
            conversationHistory: [],
            parsedIntent: {},
            tags: [],
            status: 'active',
          });
        }

        // Add message to conversation history
        session.conversationHistory = session.conversationHistory || [];
        session.conversationHistory.push({
          text: message,
          sender: 'user',
          timestamp: new Date(),
        });

        // Parse user message using context engine
        const parsed = parseUserMessage(message, session.conversationHistory || []);
        const parsedIntent = parsed.intent || {};
        const newTags = parsed.tags || [];

        // Update session with parsed intent and tags
        session.parsedIntent = parsedIntent;
        const existingTags = session.tags || [];
        session.tags = Array.from(new Set([...existingTags, ...newTags]));

        // Get recommendations
        const recommendations = await getRecommendations(parsedIntent, 3);

        // Save session to database
        await session.save();

        // Emit AI response back to mobile client
        socket.emit('mobile:aiResponse', {
          message: parsed.summary || 'Got it. I will keep this in mind.',
          intent: parsedIntent,
          tags: session.tags,
          recommendations: recommendations.products || [],
          confidence: parsed.confidence || 0,
        });
      } catch (error) {
        console.error('Error handling mobile:message:', error);
        socket.emit('mobile:error', {
          message: 'Error processing message',
          error: error.message,
        });
      }
    });

    // Handle mobile:generateQR event
    socket.on('mobile:generateQR', async (data) => {
      try {
        const { sessionId } = data || {};

        if (!sessionId) {
          socket.emit('mobile:error', {
            message: 'sessionId is required',
          });
          return;
        }

        // Generate QR code
        const qrData = await generateQR(sessionId);

        // Update session with QR code data
        const session = await Session.findOne({ sessionId });
        if (session) {
          session.qrCode = qrData.qrId;
          session.qrExpiry = qrData.expiresAt;
          await session.save();
        }

        // Emit QR code data back to mobile client
        socket.emit('mobile:qrGenerated', {
          qrId: qrData.qrId,
          qrImage: qrData.qrImage,
          expiresAt: qrData.expiresAt,
          signature: qrData.signature,
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
        socket.emit('mobile:error', {
          message: 'Error generating QR code',
          error: error.message,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Mobile client disconnected: ${socket.id}`);
      
      // Clean up Redis socket mapping
      if (redis) {
        try {
          // Find and remove this socket's mapping
          const keys = await redis.keys(`${MOBILE_PREFIX}*`);
          for (const key of keys) {
            const storedSocketId = await redis.get(key);
            if (storedSocketId === socket.id) {
              await redis.del(key);
              break;
            }
          }
        } catch (error) {
          console.error('Error cleaning up socket mapping:', error);
        }
      }
    });

    // Store socket mapping in Redis when userId is known
    // This will be called when user identifies themselves
    socket.on('mobile:identify', async (data) => {
      const { userId } = data || {};
      if (userId && redis) {
        try {
          const key = `${MOBILE_PREFIX}${userId}`;
          await redis.set(key, socket.id);
          socket.emit('mobile:identified', { userId, socketId: socket.id });
        } catch (error) {
          console.error('Error storing socket mapping:', error);
        }
      }
    });
  });
}

/**
 * Setup Kiosk Namespace (/kiosk)
 * @param {Namespace} namespace - Socket.io namespace instance
 */
function setupKioskNamespace(namespace) {
  kioskNamespace = namespace;

  namespace.on('connection', async (socket) => {
    console.log(`Kiosk connected: ${socket.id}`);

    // Welcome message
    socket.emit('kiosk:welcome', {
      message: 'Connected to kiosk namespace',
      socketId: socket.id,
    });

    // Handle kiosk:identify event (to store kioskId mapping)
    socket.on('kiosk:identify', async (data) => {
      const { kioskId } = data || {};
      if (kioskId && redis) {
        try {
          const key = `${KIOSK_PREFIX}${kioskId}`;
          await redis.set(key, socket.id);
          socket.emit('kiosk:identified', { kioskId, socketId: socket.id });
        } catch (error) {
          console.error('Error storing kiosk mapping:', error);
        }
      }
    });

    // Handle kiosk:scanQR event
    socket.on('kiosk:scanQR', async (data) => {
      try {
        const { qrId, signature, kioskId } = data || {};

        if (!qrId || !signature) {
          socket.emit('kiosk:invalidQR', {
            message: 'qrId and signature are required',
          });
          return;
        }

        // Store socket mapping in Redis for this kioskId (if provided)
        if (kioskId && redis) {
          try {
            const key = `${KIOSK_PREFIX}${kioskId}`;
            await redis.set(key, socket.id);
          } catch (error) {
            console.error('Error storing kiosk socket mapping:', error);
          }
        }

        // Validate QR code
        const sessionId = await validateQR(qrId, signature);

        if (!sessionId) {
          socket.emit('kiosk:invalidQR', {
            message: 'Invalid or expired QR code',
          });
          return;
        }

        // Fetch full session from MongoDB
        const session = await Session.findOne({ sessionId });
        if (!session) {
          socket.emit('kiosk:invalidQR', {
            message: 'Session not found',
          });
          return;
        }

        // Update session status to 'transferred'
        session.status = 'transferred';
        await session.save();

        // Get recommendations
        const recommendations = await getRecommendations(session.parsedIntent || {}, 5);

        // Emit session data to kiosk
        socket.emit('kiosk:sessionData', {
          sessionId: session.sessionId,
          userId: session.userId,
          parsedIntent: session.parsedIntent,
          tags: session.tags,
          conversationHistory: session.conversationHistory,
          recommendations: recommendations.products || [],
          explanations: recommendations.explanations || [],
          confidence: recommendations.confidence || 0,
        });

        // Find mobile socket and emit session transferred notification
        if (session.userId && mobileNamespace) {
          try {
            const mobileSocket = await getSocketByUserId(session.userId, 'mobile');
            if (mobileSocket) {
              mobileSocket.emit('mobile:sessionTransferred', {
                sessionId: session.sessionId,
                message: 'Your session has been transferred to the kiosk',
                kioskId: kioskId || 'unknown',
              });
            }
          } catch (error) {
            console.error('Error notifying mobile client:', error);
          }
        }

        console.log(`QR code validated and session transferred: ${sessionId} -> Kiosk ${kioskId || 'unknown'}`);
      } catch (error) {
        console.error('Error handling kiosk:scanQR:', error);
        socket.emit('kiosk:error', {
          message: 'Error processing QR code',
          error: error.message,
        });
      }
    });

    // Handle kiosk:requestAssociate event
    socket.on('kiosk:requestAssociate', async (data) => {
      try {
        const { sessionId, productId, kioskId } = data || {};

        if (!sessionId || !productId) {
          socket.emit('kiosk:error', {
            message: 'sessionId and productId are required',
          });
          return;
        }

        // Fetch session and product details
        const [session, product] = await Promise.all([
          Session.findOne({ sessionId }),
          Product.findOne({ productId }),
        ]);

        if (!session || !product) {
          socket.emit('kiosk:error', {
            message: 'Session or product not found',
          });
          return;
        }

        // Emit to staff namespace (placeholder for now)
        // TODO: Implement staff namespace when ready
        console.log(`Associate requested at Kiosk ${kioskId || 'unknown'}`);
        console.log(`  Session: ${sessionId}`);
        console.log(`  Product: ${product.name} (${productId})`);
        console.log(`  User: ${session.userId}`);

        // For now, just acknowledge the request
        socket.emit('kiosk:associateRequested', {
          message: 'Associate request received',
          sessionId,
          productId,
          productName: product.name,
        });
      } catch (error) {
        console.error('Error handling kiosk:requestAssociate:', error);
        socket.emit('kiosk:error', {
          message: 'Error processing associate request',
          error: error.message,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Kiosk disconnected: ${socket.id}`);
      
      // Clean up Redis socket mapping
      if (redis) {
        try {
          const keys = await redis.keys(`${KIOSK_PREFIX}*`);
          for (const key of keys) {
            const storedSocketId = await redis.get(key);
            if (storedSocketId === socket.id) {
              await redis.del(key);
              break;
            }
          }
        } catch (error) {
          console.error('Error cleaning up kiosk socket mapping:', error);
        }
      }
    });
  });
}

/**
 * Initialize Socket Manager
 * Sets up all namespaces and events
 * 
 * @param {Server} io - Socket.io server instance
 */
function initializeSocketManager(io) {
  if (!io) {
    throw new Error('Socket.io server instance is required');
  }

  // Create namespaces
  const mobileNs = io.of('/mobile');
  const kioskNs = io.of('/kiosk');

  // Setup mobile namespace
  setupMobileNamespace(mobileNs);

  // Setup kiosk namespace
  setupKioskNamespace(kioskNs);

  // Start background job to cleanup expired QR codes (every minute)
  setInterval(() => {
    cleanupExpiredQRs();
  }, 60000); // 60 seconds

  console.log('Socket Manager initialized');
  console.log('  - Mobile namespace: /mobile');
  console.log('  - Kiosk namespace: /kiosk');
  console.log('  - QR cleanup job: Running every 60 seconds');
}

module.exports = {
  initializeSocketManager,
  getSocketByUserId,
  broadcastToKiosks,
  cleanupExpiredQRs,
};

