const fetch = require('node-fetch')

async function createActivePaymentAndTest() {
  console.log('=== アクティブ支払い作成とテスト ===')
  
  const baseUrl = 'http://localhost:3000'
  
  try {
    // 商品情報を取得
    console.log('1. 商品情報取得中...')
    const productsResponse = await fetch(`${baseUrl}/api/products`)
    
    if (!productsResponse.ok) {
      console.log('❌ 商品情報取得失敗:', productsResponse.status)
      return
    }
    
    const products = await productsResponse.json()
    const targetProduct = products.find(p => p.name === '店頭決済用')
    
    if (!targetProduct) {
      console.log('❌ 店頭決済用商品が見つかりません')
      return
    }
    
    console.log('✅ 商品情報取得成功:', targetProduct.name, targetProduct.uuid)
    
    // 新しい支払いを作成
    console.log('\n2. 新しい支払い作成中...')
    const paymentResponse = await fetch(`${baseUrl}/api/payment/${targetProduct.uuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 2,
        customFields: {}
      })
    })
    
    if (!paymentResponse.ok) {
      console.log('❌ 支払い作成失敗:', paymentResponse.status)
      const errorText = await paymentResponse.text()
      console.log('エラー詳細:', errorText.substring(0, 500))
      return
    }
    
    const paymentData = await paymentResponse.json()
    console.log('✅ 支払い作成成功:', {
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      expireAt: paymentData.expireAt
    })
    
    const newPaymentId = paymentData.paymentId
    
    // 支払い詳細を取得
    console.log('\n3. 支払い詳細確認中...')
    const detailResponse = await fetch(`${baseUrl}/api/payment/status/${newPaymentId}`)
    
    if (detailResponse.ok) {
      const detail = await detailResponse.json()
      console.log('✅ 支払い詳細:', {
        paymentId: detail.paymentId,
        status: detail.status,
        recipientAddress: detail.recipientAddress,
        amount: detail.amount,
        expireAt: detail.expireAt
      })
      
      // 監視APIをテスト
      console.log('\n4. 監視API接続テスト...')
      console.log(`監視URL: ${baseUrl}/api/payment/monitor/${newPaymentId}`)
      console.log(`支払いページ: ${baseUrl}/payment/${newPaymentId}`)
      
      // SSE接続をテスト（短時間）
      const monitorResponse = await fetch(`${baseUrl}/api/payment/monitor/${newPaymentId}`, {
        headers: {
          'Accept': 'text/event-stream'
        }
      })
      
      if (monitorResponse.ok) {
        console.log('✅ 監視API接続成功')
        
        const reader = monitorResponse.body.getReader()
        const decoder = new TextDecoder()
        
        console.log('📡 初期データ受信中...')
        
        // 最初の数秒間のデータを確認
        let dataReceived = false
        const timeout = setTimeout(() => {
          console.log('⏰ 5秒経過、接続終了')
          reader.cancel()
        }, 5000)
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            const chunk = decoder.decode(value)
            if (chunk.trim()) {
              console.log('📡 受信データ:', chunk.trim())
              dataReceived = true
            }
          }
        } catch (error) {
          console.log('📡 読み取り終了:', error.message)
        } finally {
          clearTimeout(timeout)
        }
        
        if (dataReceived) {
          console.log('✅ SSE通信が正常に動作しています')
        } else {
          console.log('⚠️ データが受信されませんでした')
        }
        
      } else {
        console.log('❌ 監視API接続失敗:', monitorResponse.status)
      }
      
      console.log('\n🔗 テスト用URL:')
      console.log(`支払いページ: ${baseUrl}/payment/${newPaymentId}`)
      console.log('\n📝 手動テスト手順:')
      console.log('1. 上記URLにアクセス')
      console.log('2. QRコードをSymbol ウォレットで読み取り')
      console.log(`3. メッセージに "${newPaymentId}" を入力`)
      console.log('4. 2 XYM を送金')
      console.log('5. 監視APIがリアルタイムで検知するか確認')
      
      return newPaymentId
      
    } else {
      console.log('❌ 支払い詳細取得失敗:', detailResponse.status)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

createActivePaymentAndTest()
