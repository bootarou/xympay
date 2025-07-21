const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findPaymentByMessage() {
  try {
    console.log('=== メッセージから決済を検索 ===')
    
    // 送信されたメッセージ
    const sentMessage = 'Z0BY4UEW'
    console.log('送信されたメッセージ:', sentMessage)
    console.log('')
    
    // 1. 該当する決済を検索
    const payment = await prisma.payment.findUnique({
      where: { paymentId: sentMessage },
      include: {
        product: true,
        address: true
      }
    })
    
    if (payment) {
      console.log('✅ 該当する決済が見つかりました!')
      console.log('決済ID:', payment.paymentId)
      console.log('商品名:', payment.product.name)
      console.log('金額 (μXYM):', payment.amount)
      console.log('金額 (XYM):', Number(payment.amount) / 1000000)
      console.log('受取アドレス:', payment.address.address)
      console.log('ステータス:', payment.status)
      console.log('作成日時:', payment.createdAt.toISOString())
      console.log('期限:', payment.expireAt.toISOString())
      console.log('期限切れ？:', new Date() > payment.expireAt ? 'YES' : 'NO')
      console.log('')
      
      if (new Date() > payment.expireAt) {
        console.log('❌ この決済は期限切れです')
        console.log('新しい決済を作成する必要があります')
      } else {
        console.log('✅ この決済はまだ有効です')
        console.log('')
        console.log('🔍 この決済用の監視URL:')
        console.log(`http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
        console.log('')
        console.log('📊 ステータス確認URL:')
        console.log(`http://localhost:3000/api/payment/status/${payment.paymentId}`)
      }
      
    } else {
      console.log('❌ 該当する決済が見つかりません')
      console.log('')
      console.log('🔍 類似する決済IDを検索中...')
      
      // 類似する決済を検索
      const similarPayments = await prisma.payment.findMany({
        where: {
          OR: [
            { paymentId: { contains: 'Z0BY' } },
            { paymentId: { contains: '4UEW' } },
            { paymentId: { contains: 'BY4U' } }
          ]
        },
        include: {
          product: true,
          address: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      if (similarPayments.length > 0) {
        console.log('類似する決済が見つかりました:')
        for (const p of similarPayments) {
          console.log(`- ${p.paymentId}: ${p.status} (期限: ${p.expireAt.toISOString()})`)
        }
      } else {
        console.log('類似する決済も見つかりませんでした')
      }
    }
    
    console.log('')
    console.log('=== 最新の決済一覧 ===')
    const recentPayments = await prisma.payment.findMany({
      include: {
        product: true,
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    
    for (const p of recentPayments) {
      const isExpired = new Date() > p.expireAt
      console.log(`${p.paymentId}: ${p.status} ${isExpired ? '(期限切れ)' : '(有効)'} - 作成: ${p.createdAt.toISOString()}`)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findPaymentByMessage()
