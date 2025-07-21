const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function extendPaymentExpiry() {
  try {
    console.log('=== 決済期限延長 ===')
    
    const paymentId = 'Z0BY4UEW'
    const now = new Date()
    const newExpireAt = new Date(now.getTime() + 30 * 60 * 1000) // 現在時刻から30分後
    
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: paymentId },
      data: { 
        expireAt: newExpireAt,
        status: 'pending' // ステータスもpendingに戻す
      },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('✅ 決済期限を延長しました:')
    console.log('決済ID:', updatedPayment.paymentId)
    console.log('新しい期限 (UTC):', updatedPayment.expireAt.toISOString())
    console.log('新しい期限 (JST):', updatedPayment.expireAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    console.log('ステータス:', updatedPayment.status)
    console.log('')
    
    console.log('💳 送金情報（変更なし）:')
    console.log('送金先アドレス:', updatedPayment.address.address)
    console.log('送金金額 (XYM):', Number(updatedPayment.amount) / 1000000)
    console.log('メッセージ:', updatedPayment.paymentId)
    console.log('')
    
    console.log('🔍 監視URL:')
    console.log(`http://localhost:3000/api/payment/monitor/${updatedPayment.paymentId}`)
    console.log('')
    
    console.log('📊 ステータス確認URL:')
    console.log(`http://localhost:3000/api/payment/status/${updatedPayment.paymentId}`)
    console.log('')
    
    console.log('⏰ この決済は今から30分間有効です')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

extendPaymentExpiry()
