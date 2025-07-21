const fetch = require('node-fetch');

async function testPeriodFilter() {
  try {
    console.log('Testing period filter...');
    
    // 全期間の取引数
    console.log('\n1. All periods:');
    const allResponse = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&period=all');
    const allData = await allResponse.json();
    console.log(`Total transactions: ${allData.pagination.totalCount}`);
    
    // 今日の取引
    console.log('\n2. Today only:');
    const todayResponse = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&period=today');
    const todayData = await todayResponse.json();
    console.log(`Today's transactions: ${todayData.pagination.totalCount}`);
    
    if (todayData.transactions.length > 0) {
      console.log('Sample today transaction:');
      console.log(`- ID: ${todayData.transactions[0].paymentId}`);
      console.log(`- Created: ${todayData.transactions[0].createdAt}`);
    }
    
    // 今週の取引
    console.log('\n3. This week:');
    const weekResponse = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&period=week');
    const weekData = await weekResponse.json();
    console.log(`This week's transactions: ${weekData.pagination.totalCount}`);
    
    // 今月の取引
    console.log('\n4. This month:');
    const monthResponse = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&period=month');
    const monthData = await monthResponse.json();
    console.log(`This month's transactions: ${monthData.pagination.totalCount}`);
    
    console.log('\nPeriod filter test completed!');
  } catch (error) {
    console.error('Period filter test failed:', error.message);
  }
}

testPeriodFilter();
