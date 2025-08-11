// Simple test script to verify database initialization
// Run this with: node test-database.js

const {DatabaseService} = require('./src/database');

async function testDatabase() {
  try {
    console.log('Testing database initialization...');

    const dbService = DatabaseService.getInstance();
    const result = await dbService.initializeDatabase();

    console.log('Database initialization result:', result);
    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

testDatabase();
