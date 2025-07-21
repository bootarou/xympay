const fetch = require('node-fetch');

async function testTransactionsAPIDetailed() {
  try {
    console.log('Testing transactions API with detailed response...');
    
    const response = await fetch('http://localhost:3000/api/transactions?page=1&limit=3');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('Full API Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testTransactionsAPIDetailed();
