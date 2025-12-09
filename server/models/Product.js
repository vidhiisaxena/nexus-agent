const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },
    stockCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    aisle: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ productId: 1 }, { unique: true });
productSchema.index({ tags: 1 });
productSchema.index({ category: 1, inStock: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);


