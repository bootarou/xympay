const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function monitorPaymentRealtime() {
  let checkCount = 0
  const maxChecks = 10 // 10回チェック（約5分間）
  
  console.log('=== リアルタイム監視開始 ===')
  console.log('決済ID: Z0BY4UEW')
  console.log('送金完了時刻:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  console.log('')
  
  const interval = setInterval(async () => {
    checkCount++
    console.log(`\n--- チェック ${checkCount}/${maxChecks} (${new Date().toLocaleTimeString('ja-JP')}) ---`)
    
    try {
      // 1. 決済ステータス確認
      const payment = await prisma.payment.findUnique({
        where: { paymentId: 'Z0BY4UEW' }
      })
      
      if (payment) {
        console.log('決済ステータス:', payment.status)
        console.log('確認時刻:', payment.confirmedAt?.toISOString() || '未確認')
        console.log('取引ハッシュ:', payment.transactionId || 'なし')
        
        if (payment.status === 'confirmed') {
          console.log('')
          console.log('🎉 決済が確認されました！')
          console.log('✅ Symbol決済リアルタイム検知システムが正常に動作しています')
          clearInterval(interval)
          process.exit(0)
        }
      }
      
      // 2. Symbol ブロックチェーン確認
      const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
      const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
      
      try {
        const response = await fetch(`${nodeUrl}/accounts/${address}/transactions/confirmed?pageSize=5`)
        if (response.ok) {
          const transactions = await response.json()
          console.log('ブロックチェーン取引数:', transactions.data ? transactions.data.length : 0)
          
          if (transactions.data && transactions.data.length > 0) {
            // Z0BY4UEWメッセージを探す
            for (const tx of transactions.data) {
              if (tx.transaction?.type === 16724 && tx.transaction.message?.payload) {
                const messageHex = tx.transaction.message.payload
                let message = ''
                
                try {
                  for (let j = 0; j < messageHex.length; j += 2) {
                    const hex = messageHex.substr(j, 2)
                    const charCode = parseInt(hex, 16)
                    if (charCode > 0) {
                      message += String.fromCharCode(charCode)
                    }
                  }
                  
                  if (message === 'Z0BY4UEW') {
                    console.log('🎯 Z0BY4UEWの取引をブロックチェーンで発見！')
                    console.log('金額:', parseInt(tx.transaction.mosaics[0]?.amount || 0) / 1000000, 'XYM')
                    break
                  }
                } catch (error) {
                  // メッセージデコードエラーは無視
                }
              }
            }
          }
        } else {
          console.log('ブロックチェーン: 取引履歴なし (404)')
        }
      } catch (error) {
        console.log('ブロックチェーン確認エラー:', error.message)
      }
      
    } catch (error) {
      console.error('❌ エラー:', error.message)
    }
    
    if (checkCount >= maxChecks) {
      console.log('')
      console.log('⏰ 監視時間終了')
      console.log('もし決済がまだ確認されていない場合は、以下を確認してください:')
      console.log('1. 送金が正しく完了しているか')
      console.log('2. メッセージが正確に「Z0BY4UEW」になっているか')
      console.log('3. 金額が正確に2 XYMになっているか')
      console.log('4. サーバーログにエラーがないか')
      clearInterval(interval)
      process.exit(0)
    }
  }, 30000) // 30秒間隔
  
  // 最初の1回をすぐに実行
  setTimeout(async () => {
    console.log('--- 初回チェック ---')
    // 上記のロジックを実行
  }, 1000)
}

monitorPaymentRealtime().catch(console.error)
