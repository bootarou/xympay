const { PrismaClient } = require('@prisma/client')
const { SymbolMonitor } = require('./src/lib/symbol/monitor.ts')

const prisma = new PrismaClient()

async function debugPayment() {
  try {
    console.log('=== 決済9IUXOBTD デバッグ開始 ===')
    console.log('')
    
    // 1. 決済情報取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: '9IUXOBTD' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません: 9IUXOBTD')
      return
    }
    
    console.log('✅ 決済情報:')
    console.log('決済ID:', payment.paymentId)
    console.log('商品名:', payment.product.name)
    console.log('商品価格 (XYM):', payment.product.price)
    console.log('決済金額 (DB μXYM):', payment.amount)
    console.log('決済金額 (XYM換算):', Number(payment.amount) / 1000000)
    console.log('受取アドレス:', payment.address.address)
    console.log('ステータス:', payment.status)
    console.log('メッセージ:', payment.paymentId)
    console.log('作成日時:', payment.createdAt.toISOString())
    console.log('期限:', payment.expireAt.toISOString())
    console.log('現在時刻:', new Date().toISOString())
    console.log('期限切れ？:', new Date() > payment.expireAt ? 'YES' : 'NO')
    console.log('')
    
    // 2. Symbol監視システムで取引履歴を確認
    console.log('🔍 Symbol取引履歴確認...')
    const monitor = new SymbolMonitor()
    
    try {
      const transactions = await monitor.getTransactions(payment.address.address)
      
      console.log('取得した取引数:', transactions.length)
      console.log('')
      
      if (transactions.length === 0) {
        console.log('❌ 取引履歴が見つかりません')
        console.log('可能な原因:')
        console.log('1. Symbol ノードへの接続エラー')
        console.log('2. アドレスが間違っている')
        console.log('3. まだ取引が確定していない')
      } else {
        console.log('📋 取引履歴:')
        
        // 関連する取引を探す
        let matchingTransaction = null
        
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i]
          
          console.log(`--- 取引 ${i + 1} ---`)
          console.log('取引ハッシュ:', tx.transactionInfo?.hash || 'N/A')
          console.log('高さ:', tx.transactionInfo?.height || 'N/A')
          console.log('送金者:', tx.signer?.address?.plain() || 'N/A')
          console.log('受取者:', tx.recipientAddress?.plain() || 'N/A')
          
          if (tx.mosaics && tx.mosaics.length > 0) {
            const amount = tx.mosaics[0].amount.compact()
            console.log('金額 (μXYM):', amount)
            console.log('金額 (XYM):', amount / 1000000)
          }
          
          let message = 'なし'
          if (tx.message && tx.message.payload) {
            message = tx.message.payload
            console.log('メッセージ:', message)
            
            // メッセージが一致するかチェック
            if (message === payment.paymentId) {
              console.log('✅ メッセージが一致！')
              matchingTransaction = tx
            }
          } else {
            console.log('メッセージ:', message)
          }
          
          console.log('')
        }
        
        if (matchingTransaction) {
          console.log('🎯 一致する取引が見つかりました！')
          const txAmount = matchingTransaction.mosaics[0].amount.compact()
          const expectedAmount = Number(payment.amount)
          
          console.log('期待金額 (μXYM):', expectedAmount)
          console.log('実際金額 (μXYM):', txAmount)
          console.log('金額一致？:', txAmount === expectedAmount ? 'YES' : 'NO')
          
          if (txAmount !== expectedAmount) {
            console.log('⚠️ 金額が一致しません！')
            console.log('差額 (μXYM):', txAmount - expectedAmount)
          }
        } else {
          console.log('❌ 一致する取引が見つかりません')
          console.log('メッセージに', payment.paymentId, 'を含む取引がありません')
        }
      }
      
    } catch (error) {
      console.error('❌ Symbol監視エラー:', error.message)
    }
    
    // 3. 監視API状態確認
    console.log('')
    console.log('🔍 監視API状態確認...')
    try {
      const response = await fetch(`http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
      console.log('監視API レスポンスステータス:', response.status)
      
      if (response.ok) {
        console.log('✅ 監視APIは正常に動作しています')
      } else {
        console.log('❌ 監視APIエラー:', response.statusText)
      }
    } catch (error) {
      console.error('❌ 監視API接続エラー:', error.message)
    }
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPayment()
