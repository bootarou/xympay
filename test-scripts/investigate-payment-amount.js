const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function investigatePayment() {
  try {    console.log('=== 決済金額調査開始 ===')
    console.log('決済ID: 9IUXOBTD')
    console.log('')
    
    // 決済IDで検索
    const payment = await prisma.payment.findUnique({
      where: { paymentId: '9IUXOBTD' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {      console.log('❌ 決済が見つかりません: 9IUXOBTD')
      
      // 類似する決済を検索
      const similarPayments = await prisma.payment.findMany({
        where: {
          paymentId: {
            contains: 'IUXOBTD'
          }
        },
        include: {
          product: true,
          address: true
        }
      })
      
      if (similarPayments.length > 0) {
        console.log('類似する決済が見つかりました:')
        similarPayments.forEach(p => {
          console.log(`- ${p.paymentId}: ${p.amount} (${p.product.name})`)
        })
      }
      return
    }
    
    console.log('✅ 決済情報:')
    console.log('決済ID:', payment.paymentId)
    console.log('商品名:', payment.product.name)
    console.log('商品価格:', payment.product.price, 'XYM')
    console.log('決済金額 (DB):', payment.amount)
    console.log('決済金額 (XYM):', Number(payment.amount) / 1000000, 'XYM')
    console.log('決済金額 (μXYM):', payment.amount, 'μXYM')
    console.log('受取アドレス:', payment.address.address)
    console.log('ステータス:', payment.status)
    console.log('作成日時:', payment.createdAt.toISOString())
    console.log('期限:', payment.expireAt.toISOString())
    console.log('')
    
    console.log('🔍 期待値との比較:')
    console.log('期待値: 2 XYM = 2000000 μXYM')
    console.log('実際の値:', payment.amount, 'μXYM =', Number(payment.amount) / 1000000, 'XYM')
    console.log('差異:', Number(payment.amount) - 2000000, 'μXYM')
    
    if (Number(payment.amount) !== 2000000) {
      console.log('⚠️  金額に不一致があります！')
      console.log('')
      console.log('可能な原因:')
      console.log('1. 商品価格設定の問題')
      console.log('2. 単位変換の問題 (XYM ↔ μXYM)')
      console.log('3. 決済作成時のロジックエラー')
    } else {
      console.log('✅ 金額は期待値と一致しています！')
    }
    
  } catch (error) {
    console.error('❌ 調査エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigatePayment()
