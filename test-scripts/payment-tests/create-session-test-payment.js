const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSessionTestPayment() {
  try {
    console.log('=== セッション決済テスト作成開始 ===')
    
    // 既存の商品を使用
    const product = await prisma.product.findFirst({
      where: { name: 'test' }
    })
    
    if (!product) {
      console.log('❌ 商品が見つかりません')
      return
    }
    
    // アドレスを取得
    const address = await prisma.address.findFirst({
      where: { isDefault: true }
    })
    
    if (!address) {
      console.log('❌ デフォルトアドレスが見つかりません')
      return
    }
    
    // セッション決済を作成
    const sessionKey = `payment_session_${Date.now()}_test`
    const now = new Date()
    const expireAt = new Date(now.getTime() + 30 * 60 * 1000) // 30分後
    
    const payment = await prisma.payment.create({
      data: {
        paymentId: `session-${Date.now()}`,
        productId: product.id,
        addressId: address.id,
        amount: product.price, // microXYM で保存
        status: 'pending',
        expireAt: expireAt,
        message: sessionKey, // セッションキーをmessageに格納
        formData: {}
      },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('🎉 セッション決済作成完了!')
    console.log('決済ID:', payment.paymentId)
    console.log('セッションキー:', sessionKey)
    console.log('商品名:', payment.product.name)
    console.log('金額:', payment.amount, 'μXYM')
    console.log('金額(XYM換算):', (payment.amount / 1000000), 'XYM')
    console.log('受取アドレス:', payment.address.address)
    console.log('期限:', payment.expireAt.toISOString())
    console.log('カスタムフィールド数:', payment.product.customFields?.length || 0)
    console.log('')
    console.log('📱 セッション決済URL:')
    console.log(`http://localhost:3001/payment/session/${sessionKey}`)
    console.log('')
    console.log('⚠️  このURLをブラウザで開いて hydration エラーをテストしてください。')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSessionTestPayment()
