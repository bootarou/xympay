const { PrismaClient } = require('@prisma/client')

async function debugPaymentQuery() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== 支払い情報詳細デバッグ ===')
    
    // 最新の支払い情報を取得（APIと同じ方法で）
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        product: true,
        address: true
      }
    })
    
    if (payments.length === 0) {
      console.log('支払い情報が見つかりません')
      return
    }
    
    console.log(`最新の${payments.length}件の支払い情報（リレーション含む）:`)
    
    payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Payment ID: ${payment.paymentId}`)
      console.log(`   DB ID: ${payment.id}`)
      console.log(`   金額: ${payment.amount} XYM`)
      console.log(`   メッセージ: ${payment.message}`)
      console.log(`   Address ID: ${payment.addressId}`)
      console.log(`   ステータス: ${payment.status}`)
      console.log(`   作成日時: ${payment.createdAt}`)
      
      // Addressリレーション
      console.log(`   Address情報:`, payment.address ? {
        id: payment.address.id,
        address: payment.address.address,
        label: payment.address.label
      } : 'null')
      
      // Productリレーション
      console.log(`   Product情報:`, payment.product ? {
        id: payment.product.id,
        name: payment.product.name,
        uuid: payment.product.uuid
      } : 'null')
    })
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPaymentQuery()
