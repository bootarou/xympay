const fetch = require('node-fetch')

async function testCurrentPaymentMonitoring() {
  console.log('=== 現在の支払い監視テスト ===')
  
  const paymentId = 'KVFAUH5P'
  const baseUrl = 'http://localhost:3000'
  
  try {
    // 1. 支払いステータスAPI確認
    console.log('1. 支払いステータス確認...')
    const statusResponse = await fetch(`${baseUrl}/api/payment/status/${paymentId}`)
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('✅ ステータスAPI成功:', statusData)
    } else {
      console.log('❌ ステータスAPI失敗:', statusResponse.status)
      return
    }
    
    // 2. 監視API確認（SSE）
    console.log('\n2. 監視API確認 (SSE)...')
    console.log(`URL: ${baseUrl}/api/payment/monitor/${paymentId}`)
    
    const monitorResponse = await fetch(`${baseUrl}/api/payment/monitor/${paymentId}`, {
      headers: {
        'Accept': 'text/event-stream'
      }
    })
    
    if (monitorResponse.ok) {
      console.log('✅ 監視API接続成功')
      console.log('ヘッダー:', {
        'content-type': monitorResponse.headers.get('content-type'),
        'cache-control': monitorResponse.headers.get('cache-control')
      })
      
      // レスポンスの最初の部分を読み取り
      const reader = monitorResponse.body.getReader()
      const decoder = new TextDecoder()
      
      console.log('\n📡 SSEストリーム受信中...')
      
      // 最初の数秒間のデータを読み取り
      let timeoutId = setTimeout(() => {
        console.log('⏰ 5秒経過、ストリーム読み取り終了')
        reader.cancel()
      }, 5000)
      
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
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message)
  }
}

testCurrentPaymentMonitoring()
