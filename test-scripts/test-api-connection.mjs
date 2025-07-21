// 基本的なAPI接続テスト
async function testAPIs() {
  console.log('🧪 基本的なAPI接続テスト開始');
  console.log('================================');

  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. プリズマ接続テスト用エンドポイント
    console.log('📡 テストエンドポイントを確認中...');
    const testResponse = await fetch(`${baseUrl}/api/accounting/test`);
    const testData = await testResponse.text();
    console.log('テストエンドポイント応答:', testResponse.status, testData.substring(0, 200));
    
    // 2. 元の設定エンドポイント
    console.log('📡 設定エンドポイントを確認中...');
    const settingsResponse = await fetch(`${baseUrl}/api/accounting/settings`);
    const settingsData = await settingsResponse.text();
    console.log('設定エンドポイント応答:', settingsResponse.status, settingsData.substring(0, 200));
    
    // 3. トランザクションAPI
    console.log('📡 トランザクションAPIを確認中...');
    const transactionsResponse = await fetch(`${baseUrl}/api/transactions`);
    const transactionsData = await transactionsResponse.text();
    console.log('トランザクションAPI応答:', transactionsResponse.status, transactionsData.substring(0, 200));
    
  } catch (error) {
    console.error('❌ APIテストエラー:', error.message);
  }
}

testAPIs();
