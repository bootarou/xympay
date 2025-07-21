const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPaymentStatus() {
  try {
    const paymentId = '38cbbe9a-4b9c-4640-9fa1-82083870550b'
    
    console.log('=== 決済状態確認 ===')
    console.log('paymentId:', paymentId)
    
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
      select: {
        id: true,
        paymentId: true,
        status: true,
        amount: true,
        createdAt: true,
        expireAt: true,
        formData: true
      }
    })
    
    if (!payment) {
      console.log('決済が見つかりません')
      return
    }
    
    console.log('\n--- 決済情報 ---')
    console.log('ID:', payment.id)
    console.log('PaymentID:', payment.paymentId)
    console.log('ステータス:', payment.status)
    console.log('金額:', payment.amount)
    console.log('作成日時:', payment.createdAt)
    console.log('有効期限:', payment.expireAt)
    console.log('現在時刻:', new Date())
    console.log('期限切れ:', new Date() > new Date(payment.expireAt))
    console.log('フォームデータ:', payment.formData)
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPaymentStatus()
