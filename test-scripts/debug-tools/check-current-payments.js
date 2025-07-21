const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPayments() {
  try {
    console.log('=== 現在の決済状況 ===')
    
    const payments = await prisma.payment.findMany({
      include: {
        product: true,
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log(`決済件数: ${payments.length}`)
    console.log('')
    
    for (const payment of payments) {
      console.log(`--- ${payment.paymentId} ---`)
      console.log('商品:', payment.product.name)
      console.log('価格 (XYM):', payment.product.price)
      console.log('金額 (μXYM):', payment.amount)
      console.log('アドレス:', payment.address.address)
      console.log('ステータス:', payment.status)
      console.log('作成:', payment.createdAt.toISOString())
      console.log('期限:', payment.expireAt.toISOString())
      console.log('期限切れ？:', new Date() > payment.expireAt ? 'YES' : 'NO')
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPayments()
