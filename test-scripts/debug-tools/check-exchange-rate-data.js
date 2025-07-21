const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPaymentExchangeRateData() {
  try {
    console.log('=== 決済の為替レート情報確認 ===')
    
    // 最新の決済を3つ取得
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        product: true,
        address: true
      }
    })
    
    if (payments.length === 0) {
      console.log('❌ 決済データが見つかりません')
      return
    }
    
    payments.forEach((payment, index) => {
      console.log(`\n--- 決済 ${index + 1} ---`)
      console.log('決済ID:', payment.paymentId)
      console.log('金額 (DB):', payment.amount.toString(), 'μXYM')
      console.log('金額 (XYM):', (Number(payment.amount) / 1000000), 'XYM')
      console.log('ステータス:', payment.status)
      console.log('商品名:', payment.product.name)
      console.log('作成日時:', payment.createdAt.toLocaleString('ja-JP'))
      console.log('確認日時:', payment.confirmedAt ? payment.confirmedAt.toLocaleString('ja-JP') : 'null')
      console.log('取引ハッシュ:', payment.transactionId || 'null')
      console.log('')
      console.log('🔄 為替レート情報:')
      console.log('  レート:', payment.exchangeRate ? payment.exchangeRate.toString() : 'null')
      console.log('  基軸通貨:', payment.baseCurrency || 'null')
      console.log('  基軸金額:', payment.baseCurrencyAmount ? payment.baseCurrencyAmount.toString() : 'null')
      console.log('  レート提供者:', payment.rateProvider || 'null')
      console.log('  レート取得時刻:', payment.rateTimestamp ? payment.rateTimestamp.toLocaleString('ja-JP') : 'null')
    })
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPaymentExchangeRateData()
