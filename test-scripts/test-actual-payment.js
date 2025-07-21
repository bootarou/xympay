const { PrismaClient } = require('@prisma/client')
const { SymbolMonitor } = require('./src/lib/symbol/monitor')

async function testActualPayment() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== 実際の支払い検出テスト ===')
    
    const paymentId = 'X3KWSV3P' // 最新のpending支払い
    
    // 支払い情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('支払い情報が見つかりません')
      return
    }
    
    console.log('テスト対象支払い情報:')
    console.log('  Payment ID:', payment.paymentId)
    console.log('  金額:', payment.amount, 'XYM')
    console.log('  受信アドレス:', payment.address.address)
    console.log('  期待メッセージ:', paymentId)
    console.log('  ステータス:', payment.status)
    console.log('  作成日時:', payment.createdAt)
    
    // Symbol監視を実行
    console.log('\n=== Symbol ブロックチェーン監視開始 ===')
    const monitor = new SymbolMonitor()
    
    // 接続テスト
    const isConnected = await monitor.testConnection()
    if (!isConnected) {
      console.log('❌ Symbol ノードに接続できません')
      return
    }
    
    console.log('✅ Symbol ノード接続成功')
    
    // トランザクション検索
    const result = await monitor.checkForTransaction(
      payment.address.address,    // 受信アドレス
      paymentId,                 // 期待メッセージ
      Number(payment.amount),    // 期待金額（XYM）
      payment.createdAt          // 作成日時以降
    )
    
    if (result) {
      console.log('\n✅ トランザクション発見！')
      console.log('  Transaction ID:', result.transactionId)
      console.log('  送信者アドレス:', result.senderAddress)
      console.log('  受信者アドレス:', result.recipientAddress)
      console.log('  金額 (マイクロXYM):', result.amount)
      console.log('  金額 (XYM):', result.amount / 1000000)
      console.log('  メッセージ:', result.message)
      console.log('  タイムスタンプ:', result.timestamp)
      console.log('  ブロック高:', result.blockHeight)
      
      // 送信者と受信者が同じかチェック
      if (result.senderAddress === result.recipientAddress) {
        console.log('⚠️  注意: 送信者と受信者が同じアドレスです（自己送金）')
      }
    } else {
      console.log('\n❌ 条件に一致するトランザクションが見つかりませんでした')
      console.log('以下を確認してください:')
      console.log('  1. アドレス宛てに正確に', payment.amount, 'XYMが送金されているか')
      console.log('  2. メッセージに', paymentId, 'が含まれているか')
      console.log('  3. 送金が', payment.createdAt, '以降に行われているか')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testActualPayment()
