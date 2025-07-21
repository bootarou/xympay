const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkExpiredPayment() {
  try {
    const payment = await prisma.payment.findUnique({
      where: { paymentId: 'Z0BY4UEW' },
      include: { product: true, address: true }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    console.log('=== 期限切れ決済の詳細 ===')
    console.log('決済ID:', payment.paymentId)
    console.log('ステータス:', payment.status)
    console.log('作成時刻:', payment.createdAt.toISOString())
    console.log('期限:', payment.expireAt.toISOString())
    console.log('現在時刻:', new Date().toISOString())
    console.log('期限切れ:', new Date() > payment.expireAt ? 'YES' : 'NO')
    console.log('確認時刻:', payment.confirmedAt?.toISOString() || '未確認')
    console.log('取引ハッシュ:', payment.transactionId || 'なし')
    console.log('')
    
    // 期限を延長するか、新しい決済を作成する
    if (new Date() > payment.expireAt) {
      console.log('⚠️  この決済は期限切れです')
      console.log('')
      console.log('💡 解決方法:')
      console.log('1. 新しい決済を作成する（推奨）')
      console.log('2. この決済の期限を延長する')
      console.log('')
      
      // 新しい決済作成を提案
      console.log('新しい決済を作成しますか？ (create-new-payment.js を実行)')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExpiredPayment()
