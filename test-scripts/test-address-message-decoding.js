const fetch = require('node-fetch')

async function testAddressAndMessageDecoding() {
  console.log('=== Symbol アドレス・メッセージ デコードテスト ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
  
  try {
    console.log('フレンドリーアドレス:', address)
    
    // 1. アドレス変換をテスト
    console.log('\n1. アドレス形式の確認...')
    
    // 2. トランザクション取得
    console.log('\n2. トランザクション取得とデコード...')
    const response = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=10`)
    
    if (!response.ok) {
      console.log('❌ トランザクション取得失敗:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('✅ 取得成功 - トランザクション数:', data.data?.length || 0)
    
    if (!data.data || data.data.length === 0) {
      console.log('📭 トランザクションがありません')
      return
    }
    
    // 各トランザクションでアドレスとメッセージをテスト
    for (let i = 0; i < Math.min(data.data.length, 3); i++) {
      const tx = data.data[i]
      
      console.log(`\n=== Transaction ${i + 1} ===`)
      console.log('Hash:', tx.meta?.hash?.substring(0, 16) + '...')
      console.log('Type:', tx.transaction?.type)
      
      // アドレス情報
      const recipientAddress = tx.transaction?.recipientAddress
      console.log('Recipient Address (API返却値):', recipientAddress)
      
      // Symbol アドレス形式の判定
      if (recipientAddress) {
        if (recipientAddress.length === 50 && recipientAddress.match(/^[0-9A-Fa-f]+$/)) {
          console.log('  📍 形式: HEX (50文字)')
          
          // HEX → Base32 変換をシミュレート
          try {
            // 実際のSymbol SDK変換はここでは不可能なので、期待される形式を表示
            console.log('  🔄 変換が必要: HEX → Base32')
            console.log('  📍 期待するBase32:', address)
            console.log('  ✅ 一致チェック:', recipientAddress === '98ADF6C8073ED934056D9384EB680EBC2ECA500515CEC7AB' ? '一致' : '不一致')
          } catch (error) {
            console.log('  ❌ 変換エラー:', error.message)
          }
        } else if (recipientAddress.length === 39 && recipientAddress.startsWith('T')) {
          console.log('  📍 形式: Base32 (39文字)')
          console.log('  ✅ 一致チェック:', recipientAddress === address ? '一致' : '不一致')
        } else {
          console.log('  ⚠️  不明な形式:', recipientAddress.length, '文字')
        }
      }
      
      // メッセージ情報
      const message = tx.transaction?.message
      console.log('Message Object:', message)
      
      if (message) {
        console.log('Message Type:', message.type)
        console.log('Message Payload (Raw):', message.payload)
        
        if (message.payload) {
          const payload = message.payload.toString()
          console.log('Payload String:', `"${payload}"`)
          
          // HEX形式かどうか判定
          if (payload.match(/^[0-9A-Fa-f]+$/)) {
            console.log('  📍 Payload形式: HEX')
            
            try {
              // HEX → UTF-8 変換をシミュレート
              let decoded = ''
              for (let j = 0; j < payload.length; j += 2) {
                const hex = payload.substr(j, 2)
                const charCode = parseInt(hex, 16)
                if (charCode > 0) {
                  decoded += String.fromCharCode(charCode)
                }
              }
              console.log('  🔄 HEX → UTF-8 デコード:', `"${decoded}"`)
              
              // 支払いIDパターンをチェック
              const paymentIdPattern = /[A-Z0-9]{8}/
              if (paymentIdPattern.test(decoded)) {
                console.log('  🎯 支払いIDパターンに一致:', decoded)
              }
            } catch (decodeError) {
              console.log('  ❌ デコードエラー:', decodeError.message)
            }
          } else {
            console.log('  📍 Payload形式: 非HEX (プレーンテキスト)')
            
            // 支払いIDパターンをチェック
            const paymentIdPattern = /[A-Z0-9]{8}/
            if (paymentIdPattern.test(payload)) {
              console.log('  🎯 支払いIDパターンに一致:', payload)
            }
          }
        } else {
          console.log('  📭 メッセージペイロードなし')
        }
      } else {
        console.log('  📭 メッセージオブジェクトなし')
      }
      
      // 金額情報
      if (tx.transaction?.mosaics && tx.transaction.mosaics.length > 0) {
        const mosaic = tx.transaction.mosaics[0]
        const amountMicroXym = parseInt(mosaic.amount)
        const amountXym = amountMicroXym / 1000000
        console.log('Amount:', `${amountMicroXym} microXYM (${amountXym} XYM)`)
      }
    }
    
    console.log('\n=== 結論 ===')
    console.log('1. APIからのアドレスはHEX形式（50文字）で返される')
    console.log('2. メッセージペイロードはHEX形式の可能性がある')
    console.log('3. Symbol SDKで適切な変換が必要')
    console.log('4. Base32 ↔ HEX 変換とHEX ↔ UTF-8 変換が重要')
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

testAddressAndMessageDecoding()
