const fetch = require('node-fetch')

// HEXデコード関数
function hexToUtf8(hex) {
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const hexByte = hex.substr(i, 2);
    const charCode = parseInt(hexByte, 16);
    if (charCode > 0 && charCode < 128) { // ASCII範囲のみ
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

async function searchForPaymentTransactions() {
  console.log('=== 支払いIDを含むトランザクション検索 ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
  const expectedPaymentIds = ['X3KWSV3P', 'RX3MCZ1P', '0B3H4H8X']
  
  // 支払いIDのHEXエンコード版
  const expectedPaymentIdsHex = expectedPaymentIds.map(id => {
    let hex = '';
    for (let i = 0; i < id.length; i++) {
      hex += id.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase();
    }
    return hex;
  });
  
  console.log('探している支払いID:', expectedPaymentIds)
  console.log('HEXエンコード版:', expectedPaymentIdsHex)
  
  try {
    const response = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=50`)
    
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
    
    let foundPayments = []
    
    // 全トランザクションをチェック
    for (let i = 0; i < data.data.length; i++) {
      const tx = data.data[i]
      
      console.log(`\n${i + 1}. Transaction ${tx.meta?.hash?.substring(0, 12)}...`)
      
      // 金額チェック（2 XYMのトランザクションを優先）
      let amount = 0
      if (tx.transaction?.mosaics && tx.transaction.mosaics.length > 0) {
        const mosaic = tx.transaction.mosaics[0]
        amount = parseInt(mosaic.amount) / 1000000 // XYMに変換
        console.log(`   Amount: ${amount} XYM`)
      }
      
      // メッセージチェック
      let message = tx.transaction?.message
      if (message) {
        console.log(`   Message (raw):`, message)
        
        // message が文字列の場合
        if (typeof message === 'string') {
          console.log(`   Message (string): "${message}"`)
          
          // HEX形式かチェック
          if (message.match(/^[0-9A-Fa-f]+$/)) {
            try {
              const decoded = hexToUtf8(message)
              console.log(`   Message (decoded): "${decoded}"`)
              
              // 支払いIDとの一致チェック
              const matchingPaymentId = expectedPaymentIds.find(id => decoded.includes(id))
              if (matchingPaymentId) {
                console.log(`   🎯 支払いID発見: ${matchingPaymentId}`)
                foundPayments.push({
                  paymentId: matchingPaymentId,
                  transactionHash: tx.meta?.hash,
                  amount: amount,
                  message: decoded,
                  rawMessage: message
                })
              }
            } catch (error) {
              console.log(`   デコードエラー:`, error.message)
            }
          } else {
            // プレーンテキストメッセージ
            const matchingPaymentId = expectedPaymentIds.find(id => message.includes(id))
            if (matchingPaymentId) {
              console.log(`   🎯 支払いID発見 (プレーンテキスト): ${matchingPaymentId}`)
              foundPayments.push({
                paymentId: matchingPaymentId,
                transactionHash: tx.meta?.hash,
                amount: amount,
                message: message,
                rawMessage: message
              })
            }
          }
        }
        // message がオブジェクトの場合（payload含む）
        else if (typeof message === 'object' && message.payload) {
          console.log(`   Message payload:`, message.payload)
          
          // Payloadを処理
          const payload = message.payload.toString()
          if (payload && payload !== 'undefined') {
            if (payload.match(/^[0-9A-Fa-f]+$/)) {
              try {
                const decoded = hexToUtf8(payload)
                console.log(`   Message (decoded): "${decoded}"`)
                
                const matchingPaymentId = expectedPaymentIds.find(id => decoded.includes(id))
                if (matchingPaymentId) {
                  console.log(`   🎯 支払いID発見: ${matchingPaymentId}`)
                  foundPayments.push({
                    paymentId: matchingPaymentId,
                    transactionHash: tx.meta?.hash,
                    amount: amount,
                    message: decoded,
                    rawMessage: payload
                  })
                }
              } catch (error) {
                console.log(`   デコードエラー:`, error.message)
              }
            }
          }
        }
      } else {
        console.log(`   Message: なし`)
      }
    }
    
    console.log('\n=== 検索結果 ===')
    if (foundPayments.length === 0) {
      console.log('❌ 支払いIDが含まれるトランザクションは見つかりませんでした')
      console.log('\n💡 対応方法:')
      console.log('1. Symbol ウォレットから実際にメッセージ付きで送金を行う')
      console.log('2. メッセージに支払いID（例: "X3KWSV3P"）を正確に含める')
      console.log('3. 一時的にメッセージチェックをスキップして金額のみで検証')
    } else {
      console.log(`✅ ${foundPayments.length}件の一致するトランザクションを発見:`)
      foundPayments.forEach((payment, index) => {
        console.log(`\n${index + 1}. 支払いID: ${payment.paymentId}`)
        console.log(`   Transaction: ${payment.transactionHash?.substring(0, 16)}...`)
        console.log(`   金額: ${payment.amount} XYM`)
        console.log(`   メッセージ: "${payment.message}"`)
        console.log(`   生メッセージ: ${payment.rawMessage}`)
      })
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

searchForPaymentTransactions()
