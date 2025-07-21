const fetch = require('node-fetch')

async function testMonitoringInRealTime() {
  try {
    console.log('=== リアルタイム監視テスト ===')
    console.log('決済ID: E0TTPXLC')
    console.log('')
    
    console.log('送金情報:')
    console.log('送金先: TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY')
    console.log('金額: 2 XYM')
    console.log('メッセージ: E0TTPXLC')
    console.log('')
    
    console.log('現在の決済ステータスを確認...')
    
    // まず現在のステータスを確認
    const statusResponse = await fetch('http://localhost:3000/api/payment/status/E0TTPXLC')
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('現在のステータス:', JSON.stringify(statusData, null, 2))
    } else {
      console.log('❌ ステータス取得エラー:', statusResponse.status)
    }
    
    console.log('')
    console.log('🔍 監視APIテスト (SSE接続)')
    console.log('監視URL: http://localhost:3000/api/payment/monitor/E0TTPXLC')
    console.log('')
    
    console.log('⚠️  このスクリプトでは実際のSSE接続テストは行いません。')
    console.log('ブラウザで監視URLを開いて、送金後の動作を確認してください。')
    console.log('')
    
    console.log('📝 確認手順:')
    console.log('1. ブラウザで http://localhost:3000/api/payment/monitor/E0TTPXLC を開く')
    console.log('2. Symbol ウォレットで以下の送金を実行:')
    console.log('   - 送金先: TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY')
    console.log('   - 金額: 2 XYM')
    console.log('   - メッセージ: E0TTPXLC')
    console.log('3. 監視APIが反応するかを確認')
    console.log('4. http://localhost:3000/api/payment/status/E0TTPXLC でステータスが更新されるかを確認')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testMonitoringInRealTime()
