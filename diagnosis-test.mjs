// 詳細なエラー診断テスト
async function diagnosisTest() {
  console.log('🔍 詳細エラー診断開始');
  console.log('===================');

  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. デバッグエンドポイントテスト
    console.log('📡 デバッグエンドポイントテスト...');
    const debugResponse = await fetch(`${baseUrl}/api/accounting/debug`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('ステータス:', debugResponse.status);
    console.log('ヘッダー:', [...debugResponse.headers.entries()]);
    
    const debugText = await debugResponse.text();
    console.log('レスポンス内容:', debugText);
    
    if (debugResponse.ok) {
      console.log('✅ デバッグエンドポイント成功');
      
      // JSONパース試行
      try {
        const debugJson = JSON.parse(debugText);
        console.log('📊 パースされたデータ:', debugJson);
      } catch (parseError) {
        console.log('⚠️ JSONパースエラー:', parseError.message);
      }
    } else {
      console.log('❌ デバッグエンドポイント失敗');
    }
    
    // 2. 元の設定エンドポイントテスト
    console.log('\n📡 元の設定エンドポイントテスト...');
    const settingsResponse = await fetch(`${baseUrl}/api/accounting/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('ステータス:', settingsResponse.status);
    const settingsText = await settingsResponse.text();
    console.log('レスポンス内容（最初の300文字）:', settingsText.substring(0, 300));
    
  } catch (error) {
    console.error('❌ 診断テストエラー:', error);
    console.error('エラースタック:', error.stack);
  }
}

diagnosisTest();
