const express = require('express');
const { generateQR, validateQR, expireQR } = require('../services/qrService');
const Session = require('../models/Session');

const router = express.Router();

/**
 * POST /api/qr/generate
 * Generate a QR code for a session
 */
router.post('/generate', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    // Verify session exists
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Generate QR code
    const qrData = await generateQR(sessionId);

    // Update session with QR code data
    session.qrCode = qrData.qrId;
    session.qrExpiry = qrData.expiresAt;
    await session.save();

    return res.status(200).json({
      success: true,
      data: {
        qrId: qrData.qrId,
        qrImage: qrData.qrImage,
        expiresAt: qrData.expiresAt,
        signature: qrData.signature,
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/qr/validate
 * Validate a QR code
 */
router.post('/validate', async (req, res) => {
  try {
    const { qrId, signature } = req.body;

    if (!qrId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'qrId and signature are required',
      });
    }

    // Validate QR code
    const sessionId = await validateQR(qrId, signature);

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired QR code',
      });
    }

    // Fetch session
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          parsedIntent: session.parsedIntent,
          tags: session.tags,
          conversationHistory: session.conversationHistory,
        },
      },
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /api/qr/:qrId
 * Expire a QR code immediately
 */
router.delete('/:qrId', async (req, res) => {
  try {
    const { qrId } = req.params;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        error: 'qrId is required',
      });
    }

    const deleted = await expireQR(qrId);

    return res.status(200).json({
      success: true,
      message: deleted ? 'QR code expired successfully' : 'QR code not found',
      data: {
        qrId,
        deleted,
      },
    });
  } catch (error) {
    console.error('Error expiring QR code:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;

