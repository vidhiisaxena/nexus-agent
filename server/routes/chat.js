const express = require('express');
const Session = require('../models/Session');
const { parseUserMessage } = require('../services/contextEngine');
const { getRecommendations } = require('../services/recommendationEngine');

const router = express.Router();

// Middleware: express.json() for parsing JSON bodies
router.use(express.json());

/**
 * POST /api/chat/message
 * Handle chat messages from users
 */
router.post('/message', async (req, res) => {
  try {
    const { sessionId, userId, message } = req.body || {};

    // Validate inputs
    if (!sessionId || !userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, userId, and message are required',
      });
    }

    // Validate message is a string and not empty
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'message must be a non-empty string',
      });
    }

    // Try to find existing session by sessionId
    let session = await Session.findOne({ sessionId });

    // If not found, create new session
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

    // Add user message to conversationHistory array
    session.conversationHistory = session.conversationHistory || [];
    session.conversationHistory.push({
      text: message,
      sender: 'user',
      timestamp: new Date(),
    });

    // Call contextEngine.parseUserMessage(message, conversationHistory)
    const parsed = parseUserMessage(message, session.conversationHistory || []);
    const parsedIntent = parsed.intent || {};
    const newTags = parsed.tags || [];

    // Update session.parsedIntent with new intent
    session.parsedIntent = parsedIntent;

    // Merge new tags with existing tags (avoid duplicates)
    const existingTags = session.tags || [];
    session.tags = Array.from(new Set([...existingTags, ...newTags]));

    // Call recommendationEngine.getRecommendations(parsedIntent, 3)
    const recommendationsResult = await getRecommendations(parsedIntent, 3);

    // Add AI response to conversationHistory
    const aiResponseText = parsed.summary || 'Got it. I will keep this in mind.';
    session.conversationHistory.push({
      text: aiResponseText,
      sender: 'ai',
      timestamp: new Date(),
    });

    // Save session to database
    await session.save();

    // Return 200 with success response
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        aiResponse: aiResponseText,
        parsedIntent: parsedIntent,
        tags: session.tags,
        recommendations: recommendationsResult.products || [],
      },
    });
  } catch (error) {
    console.error('Error in POST /api/chat/message:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/chat/session/:sessionId
 * Fetch session data by sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    // Fetch session by sessionId from database
    const session = await Session.findOne({ sessionId });

    // If not found, return 404
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Return 200 with session data
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        conversationHistory: session.conversationHistory || [],
        parsedIntent: session.parsedIntent || {},
        tags: session.tags || [],
        status: session.status,
        qrCode: session.qrCode,
        qrExpiry: session.qrExpiry,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/chat/session/:sessionId:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /api/chat/session/:sessionId
 * Delete session from database
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    // Delete session from database
    const result = await Session.deleteOne({ sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Return 200 with success message
    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
      data: {
        sessionId,
      },
    });
  } catch (error) {
    console.error('Error in DELETE /api/chat/session/:sessionId:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;
