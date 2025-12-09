const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const parsedIntentSchema = new mongoose.Schema(
  {
    occasion: { type: String, trim: true },
    style: { type: String, trim: true },
    budget: { type: Number, min: 0 },
    urgency: { type: String, trim: true },
    preferences: { type: [String], default: [] },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    conversationHistory: {
      type: [messageSchema],
      default: [],
      validate: {
        validator: Array.isArray,
        message: 'conversationHistory must be an array',
      },
    },
    parsedIntent: parsedIntentSchema,
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    qrCode: {
      type: String,
      default: null,
      trim: true,
    },
    qrExpiry: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'transferred', 'expired'],
      required: true,
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ sessionId: 1 }, { unique: true });
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ 'parsedIntent.occasion': 1 });
sessionSchema.index({ 'parsedIntent.style': 1 });
sessionSchema.index({ 'parsedIntent.budget': 1 });

module.exports = mongoose.model('Session', sessionSchema);


