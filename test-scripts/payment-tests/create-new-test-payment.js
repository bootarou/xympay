const fetch = require('node-fetch')

async function createNewTestPayment() {
  console.log('=== 新しいテスト支払い作成 ===')
  
  const baseUrl = 'http://localhost:3000'
  const productUuid = '3337bf2e-630e-45da-8cf5-2ef084f742fd' // 店頭決済用
  
  try {
    // 新しい支払いを作成
    console.log('新しい支払いを作成中...')
    
    const response = await fetch(`${baseUrl}/api/payment/${productUuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 2,
        customFields: {}
      })
    })
    
    if (response.ok) {
      const paymentData = await response.json()
      console.log('✅ 支払い作成成功:', paymentData)
      
      const newPaymentId = paymentData.paymentId
      console.log('🆔 新しい支払いID:', newPaymentId)
      
      // 作成直後の監視をテスト
      console.log('\n📡 監視テスト開始...')
      
      const monitorResponse = await fetch(`${baseUrl}/api/payment/monitor/${newPaymentId}`, {
        headers: {
          'Accept': 'text/event-stream'
        }
      })
      
      if (monitorResponse.ok) {
        console.log('✅ 監視API接続成功')
        
        const reader = monitorResponse.body.getReader()
        const decoder = new TextDecoder()
        
        // 最初の10秒間のデータを監視
        let timeoutId = setTimeout(() => {
          console.log('⏰ 10秒経過、ストリーム終了')
          reader.cancel()
        }, 10000)
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('📡 ストリーム終了')
              break
            }
            
            const chunk = decoder.decode(value)
            console.log('📡 受信データ:', chunk)
            
            // データを解析
            if (chunk.includes('data: ')) {
              const lines = chunk.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6))
                    console.log('📊 解析されたデータ:', data)
                    
                    if (data.status === 'confirmed') {
                      console.log('🎉 支払い確認検知！')
                      clearTimeout(timeoutId)
                      reader.cancel()
                      return
                    }
                  } catch (parseError) {
                    console.log('📊 JSON解析エラー:', line)
                  }
                }
              }
            }
          }
        } catch (readError) {
          console.log('📡 ストリーム読み取りエラー:', readError.message)
        } finally {
          clearTimeout(timeoutId)
        }
        
      } else {
        console.log('❌ 監視API失敗:', monitorResponse.status)
        const errorText = await monitorResponse.text()
        console.log('エラー内容:', errorText)
      }
      
      return newPaymentId
      
    } else {
      console.log('❌ 支払い作成失敗:', response.status)
      const errorText = await response.text()
      console.log('エラー内容:', errorText)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

createNewTestPayment().then(paymentId => {
  if (paymentId) {
    console.log('\n🔗 作成された支払いのURL:')
    console.log(`http://localhost:3000/payment/${paymentId}`)
    console.log('\n📝 テスト手順:')
    console.log('1. 上記URLにアクセス')
    console.log('2. Symbol ウォレットでQRコードを読み取り')
    console.log('3. メッセージに支払いID（' + paymentId + '）を含めて送金')
    console.log('4. 監視APIが動作しているかコンソールで確認')
  }
})
