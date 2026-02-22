// Test script for extension API endpoints

const baseUrl = 'http://localhost:3000';

async function testFactCheck() {
  console.log('Testing fact-check endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/extension/fact-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'The sky is blue during the day.'
      })
    });
    
    const data = await response.json();
    console.log('Fact-check response:', data);
    
    if (response.ok) {
      console.log('✅ Fact-check endpoint working!');
    } else {
      console.log('❌ Fact-check endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Fact-check endpoint error:', error.message);
  }
}

async function testBiasAnalysis() {
  console.log('\nTesting bias-analysis endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/extension/bias-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'This is a neutral statement about the weather.'
      })
    });
    
    const data = await response.json();
    console.log('Bias analysis response:', data);
    
    if (response.ok) {
      console.log('✅ Bias analysis endpoint working!');
    } else {
      console.log('❌ Bias analysis endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Bias analysis endpoint error:', error.message);
  }
}

async function runTests() {
  console.log('Starting extension API tests...\n');
  await testFactCheck();
  await testBiasAnalysis();
  console.log('\nTests completed!');
}

// Run tests if this is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  runTests();
} else {
  // Node.js environment
  const fetch = require('node-fetch');
  runTests();
}