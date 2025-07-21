const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createNewFreshPayment() {
  try {
    console.log('=== 新しい有効な決済を作成 ===')
    
    // 商品と住所を取得
    const product = await prisma.product.findFirst({
      where: { name: '店頭決済用' }
    })
    
    const address = await prisma.address.findFirst({
      where: { isDefault: true }
    })
    
    if (!product || !address) {
      console.log('❌ 商品またはアドレスが見つかりません')
      return
    }
    
    // 新しい決済IDを生成
    const paymentId = generatePaymentId()
    const now = new Date()
    const expireAt = new Date(now.getTime() + 30 * 60 * 1000) // 30分後
    
    const payment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: product.id,
        addressId: address.id,
        amount: product.price * 1000000, // XYM to μXYM
        status: 'pending',
        expireAt: expireAt
      },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('✅ 新しい決済を作成しました:')
    console.log('決済ID:', payment.paymentId)
    console.log('金額 (μXYM):', payment.amount)
    console.log('金額 (XYM):', Number(payment.amount) / 1000000)
    console.log('受取アドレス:', payment.address.address)
    console.log('期限:', payment.expireAt.toISOString())
    console.log('')
    
    console.log('💳 送金情報:')
    console.log('送金先アドレス:', payment.address.address)
    console.log('送金金額 (XYM):', Number(payment.amount) / 1000000)
    console.log('メッセージ:', payment.paymentId)
    console.log('')
    
    console.log('🔍 監視URL:')
    console.log(`http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
    console.log('')
    
    console.log('📊 ステータス確認URL:')
    console.log(`http://localhost:3000/api/payment/status/${payment.paymentId}`)
    console.log('')
    
    console.log('⏰ この決済は30分間有効です')
    console.log('Symbol ウォレットで上記の情報を使用して送金してください')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function generatePaymentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

createNewFreshPayment()
