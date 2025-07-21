const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createPaymentForSentMessage() {
  try {
    console.log('=== 送信済みメッセージに対応する決済を作成 ===')
    console.log('メッセージ: Z0BY4UEW')
    console.log('')
    
    // 商品を取得
    const product = await prisma.product.findFirst({
      where: { name: '店頭決済用' }
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
      console.log('❌ アドレスが見つかりません')
      return
    }
    
    // Z0BY4UEWの決済を作成
    const now = new Date()
    const expireAt = new Date(now.getTime() + 30 * 60 * 1000) // 30分後
    
    const payment = await prisma.payment.create({
      data: {
        paymentId: 'Z0BY4UEW',
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
    
    console.log('✅ Z0BY4UEWの決済を作成しました:')
    console.log('決済ID:', payment.paymentId)
    console.log('金額 (μXYM):', payment.amount)
    console.log('金額 (XYM):', Number(payment.amount) / 1000000)
    console.log('受取アドレス:', payment.address.address)
    console.log('期限:', payment.expireAt.toISOString())
    console.log('')
    
    console.log('🔍 この決済用の監視URL:')
    console.log(`http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
    console.log('')
    console.log('📊 ステータス確認URL:')
    console.log(`http://localhost:3000/api/payment/status/${payment.paymentId}`)
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('❌ Z0BY4UEWの決済は既に存在します')
    } else {
      console.error('❌ エラー:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createPaymentForSentMessage()
