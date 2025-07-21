const fetch = require('node-fetch')

async function testExpiredPaymentDetection() {
  console.log('=== 期限切れ支払いの検出テスト ===')
  
  const baseUrl = 'http://localhost:3000'
  const paymentId = 'KVFAUH5P' // 期限切れの支払い
  
  try {
    console.log('期限切れ支払いの監視APIテスト...')
    console.log(`URL: ${baseUrl}/api/payment/monitor/${paymentId}`)
    
    const response = await fetch(`${baseUrl}/api/payment/monitor/${paymentId}`, {
      headers: {
        'Accept': 'text/event-stream'
      }
    })
    
    if (response.ok) {
      console.log('✅ API接続成功')
      
      const responseText = await response.text()
      console.log('📡 レスポンス内容:', responseText)
      
      try {
        const jsonResponse = JSON.parse(responseText)
        console.log('📊 解析されたレスポンス:', jsonResponse)
        
        if (jsonResponse.status === 'confirmed') {
          console.log('🎉 期限切れ後にトランザクション発見・更新成功！')
        } else if (jsonResponse.status === 'expired') {
          console.log('⏰ 期限切れ確認（トランザクション未発見）')
        }
      } catch (parseError) {
        console.log('📊 JSON解析エラー:', parseError.message)
        console.log('レスポンスはJSONではありません')
      }
      
    } else {
      console.log('❌ API失敗:', response.status)
      const errorText = await response.text()
      console.log('エラー内容:', errorText)
    }
    
    // 更新後のステータスを確認
    console.log('\n📋 更新後のステータス確認...')
    const statusResponse = await fetch(`${baseUrl}/api/payment/status/${paymentId}`)
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('📊 現在のステータス:', {
        paymentId: statusData.paymentId,
        status: statusData.status,
        transactionId: statusData.transactionId,
        confirmedAt: statusData.confirmedAt
      })
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message)
  }
}

testExpiredPaymentDetection()
