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

// Symbol タイムスタンプ変換（修正版）
function symbolTimestampToDate(symbolTimestamp) {
  // Symbol Epochは2016年3月29日 00:06:25 UTC
  const symbolEpoch = Date.UTC(2016, 2, 29, 0, 6, 25, 0)
  
  // symbolTimestampはマイクロ秒単位なので、ミリ秒に変換
  const timestampMs = parseInt(symbolTimestamp) / 1000
  
  return new Date(symbolEpoch + timestampMs)
}

async function checkWithCorrectTimestamp() {
  console.log('=== 修正されたタイムスタンプでの検索 ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
  const targetPaymentId = 'KVFAUH5P'
  
  console.log('探している支払いID:', targetPaymentId)
  console.log('支払い作成時刻: 2025-06-29T01:42:04.347Z')
  
  try {
    const response = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=20`)
    
    if (!response.ok) {
      console.log('❌ トランザクション取得失敗:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('✅ 取得成功 - トランザクション数:', data.data?.length || 0)
    
    // 全トランザクションをチェック（タイムスタンプ修正版）
    for (let i = 0; i < data.data.length; i++) {
      const tx = data.data[i]
      
      console.log(`\n${i + 1}. Transaction ${tx.meta?.hash?.substring(0, 12)}...`)
      
      // タイムスタンプをチェック（修正版）
      const timestamp = tx.meta?.timestamp
      if (timestamp) {
        const txDate = symbolTimestampToDate(timestamp)
        console.log(`   タイムスタンプ (修正版): ${txDate.toISOString()}`)
        
        // 支払い作成時刻以降のトランザクションのみチェック
        const paymentCreatedAt = new Date('2025-06-29T01:42:04.347Z')
        if (txDate < paymentCreatedAt) {
          console.log(`   ⏰ 支払い作成前のトランザクション、スキップ`)
          continue
        }
        
        console.log(`   ✅ 支払い作成後のトランザクション`)
      }
      
      // 金額チェック
      let amount = 0
      if (tx.transaction?.mosaics && tx.transaction.mosaics.length > 0) {
        const mosaic = tx.transaction.mosaics[0]
        amount = parseInt(mosaic.amount) / 1000000
        console.log(`   Amount: ${amount} XYM`)
        
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
                
                console.log('\n✅ KVFAUH5P の送金を確認しました！')
                console.log('  Transaction Hash:', tx.meta?.hash)
                console.log('  金額:', amount, 'XYM')
                console.log('  メッセージ:', decoded)
                console.log('  タイムスタンプ:', txDate.toISOString())
                
                return {
                  found: true,
                  transaction: tx,
                  decoded: decoded,
                  timestamp: txDate.toISOString()
                }
              }
            } catch (error) {
              console.log(`   デコードエラー:`, error.message)
            }
          } else {
            if (message.includes(targetPaymentId)) {
              console.log(`   🎯 支払いID発見 (プレーンテキスト): ${targetPaymentId}`)
              return {
                found: true,
                transaction: tx,
                decoded: message,
                timestamp: txDate.toISOString()
              }
            }
          }
        }
      } else {
        console.log(`   Message: なし`)
      }
    }
    
    console.log('\n❌ KVFAUH5P の送金は見つかりませんでした')
    return { found: false }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
    return { found: false, error: error.message }
  }
}

checkWithCorrectTimestamp().then(result => {
  if (result.found) {
    console.log('\n🔍 問題分析:')
    console.log('1. ✅ ブロックチェーン上にトランザクションは存在する')
    console.log('2. ❌ monitor.ts のタイムスタンプ変換に問題がある可能性')
    console.log('3. ❌ 期限切れ支払いでは監視APIが動作しない')
    console.log('4. ❌ データベース更新処理が呼び出されていない')
    
    console.log('\n💡 修正すべき箇所:')
    console.log('1. monitor.ts のタイムスタンプ変換ロジック')
    console.log('2. 期限切れ支払いに対する監視処理')
    console.log('3. 手動でのデータベース更新処理')
  } else {
    console.log('\n💡 次のステップ:')
    console.log('1. 新しい支払いを作成')
    console.log('2. 実際にメッセージ付きで送金')
    console.log('3. 監視APIの動作確認')
  }
})
