const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPaymentFlow() {
  try {
    console.log('=== 決済フローテスト開始 ===')
    
    // 最新の決済を取得
    const payment = await prisma.payment.findFirst({
      where: { status: 'pending' },
      include: {
        product: true,
        address: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!payment) {
      console.log('❌ アクティブな決済が見つかりません')
      console.log('まず create-simple-test-payment.js を実行してください')
      return
    }
    
    console.log('✅ テスト対象決済:')
    console.log('決済ID:', payment.paymentId)
    console.log('商品:', payment.product.name)
    console.log('金額:', payment.amount, 'XYM')
    console.log('受取アドレス:', payment.address.address)
    console.log('期限:', payment.expireAt.toISOString())
    console.log('')
    
    console.log('🔗 テスト用URL:')
    console.log('決済ページ:', `http://localhost:3000/payment/${payment.paymentId}`)
    console.log('監視API:', `http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
    console.log('')
    
    console.log('📝 XYM送金テスト手順:')
    console.log('1. Symbol Walletを開く')
    console.log('2. 送金先アドレス:', payment.address.address)
    console.log('3. 送金金額:', Number(payment.amount) / 1000000, 'XYM (microXYM:', payment.amount, ')')
    console.log('4. メッセージ:', payment.paymentId)
    console.log('5. 送金実行')
    console.log('')
    console.log('⏰ 10秒間隔で監視が実行されます')
    console.log('💡 ブラウザーで監視APIページを開いて、リアルタイム通知を確認してください')
    
  } catch (error) {
    console.error('❌ テスト準備エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaymentFlow()
