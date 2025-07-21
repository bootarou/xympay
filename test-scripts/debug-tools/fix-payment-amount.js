const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixPaymentAmount() {
  try {
    console.log('=== 決済金額修正開始 ===')
    console.log('対象決済ID: 0VSXVRXX')
    
    // 現在の決済情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: '0VSXVRXX' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    console.log('修正前:')
    console.log('商品価格:', payment.product.price, 'XYM')
    console.log('決済金額:', payment.amount, '(μXYM)')
    console.log('実際のXYM:', Number(payment.amount) / 1000000, 'XYM')
    
    // 正しい金額を計算 (商品価格 × 1,000,000)
    const correctAmount = Math.round(payment.product.price * 1000000)
    
    console.log('')
    console.log('修正後の計算:')
    console.log('商品価格:', payment.product.price, 'XYM')
    console.log('正しい決済金額:', correctAmount, 'μXYM')
    console.log('正しいXYM換算:', correctAmount / 1000000, 'XYM')
    
    // DBを更新
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: '0VSXVRXX' },
      data: {
        amount: correctAmount
      }
    })
    
    console.log('')
    console.log('✅ 決済金額を修正しました！')
    console.log('修正前:', payment.amount, 'μXYM')
    console.log('修正後:', updatedPayment.amount, 'μXYM')
    console.log('差額:', updatedPayment.amount - payment.amount, 'μXYM')
    
    console.log('')
    console.log('🎯 正しい送金情報:')
    console.log('送金先:', payment.address.address)
    console.log('送金金額:', correctAmount / 1000000, 'XYM')
    console.log('メッセージ:', payment.paymentId)
    
  } catch (error) {
    console.error('❌ 修正エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPaymentAmount()
