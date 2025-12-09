const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const Redis = require('ioredis');

// Redis connection for QR code storage
// Uses REDIS_URL environment variable for connection string
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying after 3 attempts
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

// Handle Redis connection events
redis.on('connect', () => {
  console.log('QR Service: Redis connected');
});

redis.on('error', (err) => {
  console.warn('QR Service: Redis error:', err.message);
});

const QR_TTL = 300; // 5 minutes in seconds
const QR_KEY_PREFIX = 'qr:';

/**
 * Generate a QR code for a session
 * 
 * Security Mechanism:
 * 1. Creates a unique qrId using UUID v4 (cryptographically random)
 * 2. Generates HMAC SHA256 signature of payload { qrId, sessionId, timestamp }
 * 3. Only stores { qrId, signature } in the QR code (no sensitive sessionId exposed)
 * 4. Stores sessionId in Redis with TTL (automatic expiration)
 * 5. Signature prevents tampering - cannot modify qrId without invalidating signature
 * 
 * @param {string} sessionId - The session ID to associate with the QR code
 * @returns {Promise<Object>} { qrId, qrImage (base64 data URL), expiresAt, signature }
 */
async function generateQR(sessionId) {
  try {
    // Validate inputs
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Generate unique QR ID using UUID v4 (cryptographically secure random)
    const qrId = uuidv4();

    // Create timestamp for payload
    const timestamp = Date.now();

    // Create payload object for signature generation
    // This payload is signed but NOT stored in the QR code for security
    const payload = {
      qrId,
      sessionId,
      timestamp,
    };

    // Create HMAC signature using SHA256
    // Security: HMAC ensures data integrity and authenticity
    // The signature is computed over the entire payload including timestamp
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
    hmac.update(payloadString);
    const signature = hmac.digest('hex');

    // Store sessionId in Redis with TTL (automatic expiration after 5 minutes)
    // Key format: qr:{qrId}
    // Value: sessionId (and we'll store timestamp separately for validation)
    // Security: TTL prevents replay attacks with old QR codes
    const redisKey = `${QR_KEY_PREFIX}${qrId}`;
    // Store as JSON to include timestamp for signature validation
    const redisValue = JSON.stringify({ sessionId, timestamp });
    await redis.setex(redisKey, QR_TTL, redisValue);

    // Generate QR code image as base64 data URL
    // Security: QR code only contains { qrId, signature } - no sensitive data
    // The sessionId is kept server-side in Redis
    const qrData = JSON.stringify({ qrId, signature });
    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Calculate expiration timestamp
    const expiresAt = timestamp + 300000; // timestamp + 5 minutes in milliseconds

    return {
      qrId,
      qrImage, // Base64 data URL (starts with "data:image/png;base64,...")
      expiresAt,
      signature, // Return signature for client reference if needed
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Validate a QR code and retrieve the session ID
 * 
 * Security Mechanism:
 * 1. Recreates the expected signature from stored data (qrId, sessionId, timestamp)
 * 2. Uses timing-safe comparison to prevent timing attacks
 * 3. Validates signature matches before returning sessionId
 * 4. One-time use: deletes QR code from Redis after validation
 * 5. Returns null if QR code expired, not found, or signature invalid
 * 
 * @param {string} qrId - The QR code ID from the scanned QR code
 * @param {string} signature - The HMAC signature from the scanned QR code
 * @returns {Promise<string|null>} sessionId if valid, null if invalid/expired
 */
async function validateQR(qrId, signature) {
  try {
    // Validate inputs
    if (!qrId || !signature) {
      return null;
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    // Check if qrId exists in Redis
    // If not found, QR code has expired or doesn't exist
    const redisKey = `${QR_KEY_PREFIX}${qrId}`;
    const redisValue = await redis.get(redisKey);

    if (!redisValue) {
      // QR code not found or expired
      return null;
    }

    // Parse stored data (contains sessionId and timestamp)
    let storedData;
    try {
      storedData = JSON.parse(redisValue);
    } catch (error) {
      console.error('Error parsing Redis value:', error);
      return null;
    }

    const { sessionId, timestamp } = storedData;

    // Recreate the original payload that was used to generate the signature
    const payload = {
      qrId,
      sessionId,
      timestamp,
    };

    // Recreate the expected signature using the same HMAC method
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    // Verify signature using timing-safe comparison
    // Security: crypto.timingSafeEqual prevents timing attacks
    // An attacker cannot determine which part of the signature is wrong
    if (signature.length !== expectedSignature.length) {
      // Delete invalid QR code to prevent retry attacks
      await redis.del(redisKey);
      return null;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      console.warn(`Invalid QR signature for qrId: ${qrId}`);
      // Delete invalid QR code to prevent retry attacks
      await redis.del(redisKey);
      return null;
    }

    // Delete the QR code from Redis (one-time use)
    // Security: Prevents replay attacks - each QR code can only be used once
    await redis.del(redisKey);

    return sessionId;
  } catch (error) {
    console.error('Error validating QR code:', error);
    return null;
  }
}

/**
 * Expire/delete a QR code immediately
 * 
 * Security: Allows manual expiration of QR codes if needed
 * Useful for invalidating QR codes before their TTL expires
 * 
 * @param {string} qrId - The QR code ID to expire
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function expireQR(qrId) {
  try {
    if (!qrId) {
      return false;
    }

    const redisKey = `${QR_KEY_PREFIX}${qrId}`;
    const result = await redis.del(redisKey);

    // Returns true if key was deleted (existed), false if not found
    return result > 0;
  } catch (error) {
    console.error('Error expiring QR code:', error);
    return false;
  }
}

module.exports = {
  generateQR,
  validateQR,
  expireQR,
};
