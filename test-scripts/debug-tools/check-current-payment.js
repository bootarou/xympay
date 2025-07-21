const { PrismaClient } = require('@prisma/client')

async function checkCurrentPaymentStatus() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== 現在の支払い状況確認 ===')
    
    const paymentId = 'KVFAUH5P'
    
    // 支払い情報を詳細取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 支払い情報が見つかりません:', paymentId)
      return
    }
    
    console.log('📋 支払い詳細情報:')
    console.log('  Payment ID:', payment.paymentId)
    console.log('  DB ID:', payment.id)
    console.log('  金額:', payment.amount, 'XYM')
    console.log('  ステータス:', payment.status)
    console.log('  受信アドレス:', payment.address?.address)
    console.log('  商品名:', payment.product?.name)
    console.log('  作成日時:', payment.createdAt)
    console.log('  期限:', payment.expireAt)
    console.log('  確認日時:', payment.confirmedAt)
    console.log('  トランザクションID:', payment.transactionId)
    console.log('  送信者アドレス:', payment.senderAddress)
    console.log('  メッセージ:', payment.message)
    
    // 期限切れチェック
    const now = new Date()
    const isExpired = payment.expireAt < now
    console.log('  期限切れ:', isExpired ? 'はい' : 'いいえ')
    
    if (isExpired) {
      console.log('⚠️  この支払いは期限切れです')
    }
    
    // 最新の支払い一覧も確認
    console.log('\n📋 最新の支払い一覧:')
    const recentPayments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        address: true,
        product: true
      }
    })
    
    recentPayments.forEach((p, index) => {
      console.log(`${index + 1}. ${p.paymentId} - ${p.status} - ${p.amount}XYM - ${p.createdAt.toISOString()}`)
    })
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentPaymentStatus()
