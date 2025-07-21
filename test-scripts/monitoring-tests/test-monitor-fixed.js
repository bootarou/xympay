// CommonJS版のテストスクリプト
const { PrismaClient } = require('@prisma/client')

// Symbol SDK モジュールを動的にインポート
async function testMonitorWithSymbolSDK() {
  console.log('=== 修正されたmonitor.tsのテスト ===')
  
  const prisma = new PrismaClient()
  
  try {
    // TypeScript モジュールを動的インポート
    const { SymbolMonitor } = await import('./src/lib/symbol/monitor.js')
    
    // 支払い情報を取得
    const paymentId = 'X3KWSV3P'
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
    
    console.log('テスト対象支払い:')
    console.log('  Payment ID:', payment.paymentId)
    console.log('  金額:', payment.amount, 'XYM')
    console.log('  受信アドレス:', payment.address.address)
    
    // Symbol監視を実行
    const monitor = new SymbolMonitor()
    
    // 接続テスト
    const isConnected = await monitor.testConnection()
    if (!isConnected) {
      console.log('❌ Symbol ノード接続失敗')
      return
    }
    
    console.log('✅ Symbol ノード接続成功')
    
    // トランザクション検索（修正されたメッセージ処理で）
    const result = await monitor.checkConfirmedTransactions(
      payment.address.address,    // 受信アドレス
      paymentId,                 // 期待メッセージ
      Number(payment.amount),    // 期待金額（XYM）
      payment.createdAt          // 作成日時以降
    )
    
    if (result) {
      console.log('\n✅ トランザクション発見！')
      console.log('詳細:', result)
    } else {
      console.log('\n❌ 条件に一致するトランザクションが見つかりませんでした')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.error('スタック:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testMonitorWithSymbolSDK()
