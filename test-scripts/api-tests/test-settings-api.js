const fetch = require('node-fetch');

async function testSettingsAPI() {
  try {
    console.log('Testing settings API...');
    
    // GET settings
    console.log('\n1. GET /api/settings');
    const getResponse = await fetch('http://localhost:3000/api/settings');
    
    if (!getResponse.ok) {
      throw new Error(`HTTP ${getResponse.status}: ${getResponse.statusText}`);
    }
    
    const getData = await getResponse.json();
    console.log('Settings:', getData.settings);
    
    // PUT settings
    console.log('\n2. PUT /api/settings');
    const putResponse = await fetch('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        autoPaymentMonitoring: false
      })
    });
    
    if (!putResponse.ok) {
      throw new Error(`HTTP ${putResponse.status}: ${putResponse.statusText}`);
    }
    
    const putData = await putResponse.json();
    console.log('Updated settings:', putData.settings);
    
    console.log('\nSettings API test successful!');
  } catch (error) {
    console.error('Settings API test failed:', error.message);
  }
}

testSettingsAPI();
