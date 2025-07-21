const fetch = require('node-fetch');

async function testTransactionsAPI() {
  try {
    console.log('Testing transactions API...');
    
    const response = await fetch('http://localhost:3000/api/transactions?page=1&limit=5');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('API Response Structure:');
    console.log('- transactions count:', data.transactions?.length || 0);
    console.log('- pagination:', data.pagination);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('\nSample transaction:');
      console.log(JSON.stringify(data.transactions[0], null, 2));
    }
    
    console.log('\nAPI test successful!');
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testTransactionsAPI();
