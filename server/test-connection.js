require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');

async function testConnections() {
  try {
    console.log('🔍 Testing database connections...\n');
    
    // Test MongoDB
    console.log('Testing MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    console.log(`   Database: ${mongoose.connection.name}`);
    
    // Create a test document
    const TestSchema = new mongoose.Schema({ 
      project: String, 
      timestamp: Date 
    });
    const TestModel = mongoose.model('ConnectionTest', TestSchema);
    
    const doc = await TestModel.create({ 
      project: 'nexus-agent', 
      timestamp: new Date() 
    });
    console.log('✅ MongoDB write test passed!');
    console.log(`   Created document with ID: ${doc._id}`);
    
    await mongoose.disconnect();
    console.log('');

    // Test Redis
    console.log('Testing Redis...');
    const redis = new Redis(process.env.REDIS_URL);
    
    await redis.set('nexus:test', 'connection-successful');
    const value = await redis.get('nexus:test');
    console.log('✅ Redis connected successfully!');
    console.log(`   Test value retrieved: ${value}`);
    
    await redis.quit();

    console.log('\n🎉 All database connections working perfectly!');
    console.log('✅ You can now start building your Nexus Agent!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Docker is running');
    console.error('2. Run: docker-compose up -d');
    console.error('3. Check: docker ps\n');
    process.exit(1);
  }
}

testConnections();