const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixPayment9IUXOBTD() {
  try {
    console.log('=== 決済 9IUXOBTD 修正開始 ===')
    
    const payment = await prisma.payment.findUnique({
      where: { paymentId: '9IUXOBTD' },
      include: { product: true, address: true }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    console.log('修正前:')
    console.log('ステータス:', payment.status)
    console.log('金額:', payment.amount, 'μXYM')
    console.log('期限:', payment.expireAt.toISOString())
    
    // 正しい金額と新しい期限を設定
    const correctAmount = Math.round(payment.product.price * 1000000) // 2 XYM = 2,000,000 μXYM
    const newExpireAt = new Date(Date.now() + 15 * 60 * 1000) // 15分後
    
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: '9IUXOBTD' },
      data: {
        amount: correctAmount,
        status: 'pending',
        expireAt: newExpireAt
      }
    })
    
    console.log('')
    console.log('✅ 修正完了:')
    console.log('ステータス:', updatedPayment.status)
    console.log('金額:', updatedPayment.amount, 'μXYM (', updatedPayment.amount / 1000000, 'XYM )')
    console.log('新期限:', updatedPayment.expireAt.toISOString())
    
    console.log('')
    console.log('🎯 正しい送金情報:')
    console.log('送金先:', payment.address.address)
    console.log('送金金額: 2 XYM')
    console.log('メッセージ: 9IUXOBTD')
    console.log('')
    console.log('📱 決済ページ: http://localhost:3000/payment/9IUXOBTD')
    console.log('🔍 監視API: http://localhost:3000/api/payment/monitor/9IUXOBTD')
    
  } catch (error) {
    console.error('❌ 修正エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPayment9IUXOBTD()
