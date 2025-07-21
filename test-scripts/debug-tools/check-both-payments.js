const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkBothPayments() {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { paymentId: 'Z0BY4UEW' },
          { paymentId: 'E0TTPXLC' }
        ]
      },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('=== 決済検索結果 ===')
    
    if (payments.length === 0) {
      console.log('❌ Z0BY4UEWもE0TTPXLCも見つかりません')
    } else {
      for (const p of payments) {
        const isExpired = new Date() > p.expireAt
        console.log(`決済ID: ${p.paymentId}`)
        console.log(`ステータス: ${p.status}`)
        console.log(`金額: ${Number(p.amount)/1000000} XYM`)
        console.log(`期限: ${p.expireAt.toISOString()}`)
        console.log(`期限切れ: ${isExpired ? 'YES' : 'NO'}`)
        console.log(`アドレス: ${p.address.address}`)
        console.log('')
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBothPayments()
