const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INVENTORY_PATH = path.join(__dirname, '..', 'data', 'inventory.json');

const seed = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`✓ Cleared ${deleteResult.deletedCount} existing products`);

    // Read and parse inventory data
    const raw = fs.readFileSync(INVENTORY_PATH, 'utf-8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Inventory data is empty or invalid');
    }

    // Insert all products from inventory.json
    const result = await Product.insertMany(items);
    console.log(`✓ Successfully imported ${result.length} products from inventory.json`);
    console.log(`✓ Seed completed! Total products in database: ${result.length}`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
};

seed();


