const fetch = require('node-fetch')

// HEXデコード関数
function hexToUtf8(hex) {
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const hexByte = hex.substr(i, 2);
    const charCode = parseInt(hexByte, 16);
    if (charCode > 0 && charCode < 128) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

async function checkForNewPaymentTransaction() {
  console.log('=== 新しい支払いIDのトランザクション検索 ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
  const targetPaymentId = 'KVFAUH5P' // 新しい支払いID
  
  console.log('探している支払いID:', targetPaymentId)
  console.log('期待するHEXエンコード:', targetPaymentId.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(''))
  
  try {
    const response = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=20`)
    
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
    
    let foundPayment = null
    
    // 全トランザクションをチェック
    for (let i = 0; i < data.data.length; i++) {
      const tx = data.data[i]
      
      console.log(`\n${i + 1}. Transaction ${tx.meta?.hash?.substring(0, 12)}...`)
      
      // タイムスタンプをチェック（最近のもののみ）
      const timestamp = tx.meta?.timestamp
      if (timestamp) {
        // Symbol時刻をUNIX時刻に変換
        const symbolTimestamp = parseInt(timestamp)
        const unixTimestamp = symbolTimestamp + Date.UTC(2016, 2, 29, 0, 6, 25, 0)
        const txDate = new Date(unixTimestamp)
        
        console.log(`   タイムスタンプ: ${txDate.toISOString()}`)
        
        // 今日の1:30以降のトランザクションのみチェック（KVFAUH5Pの作成時刻周辺）
        const cutoffTime = new Date('2025-06-29T01:30:00.000Z')
        if (txDate < cutoffTime) {
          console.log(`   ⏰ 古いトランザクション（${cutoffTime.toISOString()}以前）、スキップ`)
          continue
        }
      }
      
      // 金額チェック
      let amount = 0
      if (tx.transaction?.mosaics && tx.transaction.mosaics.length > 0) {
        const mosaic = tx.transaction.mosaics[0]
        amount = parseInt(mosaic.amount) / 1000000
        console.log(`   Amount: ${amount} XYM`)
        
        // 2 XYMのトランザクションのみチェック
        if (amount !== 2) {
          console.log(`   ❌ 金額不一致 (期待値: 2 XYM)、スキップ`)
          continue
        }
      }
      
      // メッセージチェック
      let message = tx.transaction?.message
      if (message) {
        console.log(`   Message (raw):`, message)
        
        if (typeof message === 'string') {
          if (message.match(/^[0-9A-Fa-f]+$/)) {
            try {
              const decoded = hexToUtf8(message)
              console.log(`   Message (decoded): "${decoded}"`)
              
              if (decoded.includes(targetPaymentId)) {
                console.log(`   🎯 支払いID発見: ${targetPaymentId}`)
                foundPayment = {
                  paymentId: targetPaymentId,
                  transactionHash: tx.meta?.hash,
                  amount: amount,
                  message: decoded,
                  timestamp: txDate.toISOString()
                }
                break
              }
            } catch (error) {
              console.log(`   デコードエラー:`, error.message)
            }
          } else {
            if (message.includes(targetPaymentId)) {
              console.log(`   🎯 支払いID発見 (プレーンテキスト): ${targetPaymentId}`)
              foundPayment = {
                paymentId: targetPaymentId,
                transactionHash: tx.meta?.hash,
                amount: amount,
                message: message,
                timestamp: txDate.toISOString()
              }
              break
            }
          }
        }
      } else {
        console.log(`   Message: なし`)
      }
    }
    
    console.log('\n=== 検索結果 ===')
    if (foundPayment) {
      console.log('✅ 該当するトランザクションを発見!')
      console.log('  支払いID:', foundPayment.paymentId)
      console.log('  Transaction Hash:', foundPayment.transactionHash)
      console.log('  金額:', foundPayment.amount, 'XYM')
      console.log('  メッセージ:', foundPayment.message)
      console.log('  タイムスタンプ:', foundPayment.timestamp)
      
      console.log('\n💡 問題解析:')
      console.log('1. ✅ トランザクションは存在している')
      console.log('2. ❌ データベース更新処理が動作していない')
      console.log('3. ❌ SSE監視が正しく機能していない')
      console.log('4. ❌ 期限切れによりAPIが動作しない')
      
    } else {
      console.log('❌ 該当するトランザクションは見つかりませんでした')
      console.log('\n💡 確認ポイント:')
      console.log('1. Symbol ウォレットから実際に送金が行われているか')
      console.log('2. メッセージにKVFAUH5Pが正確に含まれているか')
      console.log('3. 送金先アドレスが正確か')
      console.log('4. 金額が2 XYMか')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

checkForNewPaymentTransaction()
