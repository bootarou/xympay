// Express のEvents APIを使ってSSE接続をテストする
async function testSSEConnection() {
  console.log('=== SSE接続テスト ===')
  console.log('決済ID: E0TTPXLC')
  console.log('監視URL: http://localhost:3000/api/payment/monitor/E0TTPXLC')
  console.log('')
  
  try {
    // Server-Sent Events接続をシミュレート
    const response = await fetch('http://localhost:3000/api/payment/monitor/E0TTPXLC', {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    })
    
    console.log('接続ステータス:', response.status)
    console.log('Content-Type:', response.headers.get('Content-Type'))
    
    if (response.ok) {
      console.log('✅ SSE接続成功')
      
      // レスポンスヘッダーを確認
      console.log('レスポンスヘッダー:')
      for (const [key, value] of response.headers) {
        console.log(`  ${key}: ${value}`)
      }
      
      console.log('')
      console.log('⚠️  注意: このテストではSSEストリームの内容は読み取りません。')
      console.log('実際の監視テストは以下の手順で行ってください:')
      console.log('')
      console.log('1. ブラウザで http://localhost:3000/api/payment/monitor/E0TTPXLC を開く')
      console.log('2. 開発者ツールのNetworkタブでSSEストリームを確認')
      console.log('3. Symbol ウォレットで送金を実行')
      console.log('4. SSEイベントが送信されるか確認')
      
    } else {
      console.log('❌ SSE接続失敗')
      const text = await response.text()
      console.log('エラー詳細:', text)
    }
    
  } catch (error) {
    console.error('❌ 接続エラー:', error.message)
  }
}

testSSEConnection()
