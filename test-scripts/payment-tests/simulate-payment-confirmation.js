const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function simulatePaymentConfirmation() {
  try {
    console.log('=== 決済確認シミュレーション ===')
    
    // 最新のpending決済を取得
    const payment = await prisma.payment.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!payment) {
      console.log('❌ pending状態の決済が見つかりません')
      return
    }
    
    console.log('決済ID:', payment.paymentId)
    console.log('元の金額:', payment.amount.toString(), 'μXYM')
    
    // 為替レートを取得
    console.log('🔄 為替レート取得中...')
    const response = await fetch('http://localhost:3001/api/exchange-rate?from=XYM&to=JPY')
    const exchangeData = await response.json()
    
    if (!exchangeData.success) {
      console.error('❌ 為替レート取得失敗:', exchangeData.error)
      return
    }
    
    const rateInfo = exchangeData.data
    console.log('為替レート:', rateInfo.rate, 'JPY/XYM')
    console.log('プロバイダー:', rateInfo.provider)
    
    // 基軸通貨での金額を計算
    const amountInXym = Number(payment.amount) / 1000000
    const baseCurrencyAmount = amountInXym * rateInfo.rate
    
    console.log('XYM金額:', amountInXym)
    console.log('JPY金額:', baseCurrencyAmount)
    
    // 決済を confirmed に更新（為替レート情報付き）
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: payment.paymentId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        transactionId: `TEST_TX_${Date.now()}`,
        senderAddress: 'TC7MZJQFXJGGBIHQHBHMQFWWZJHZDHM2KZNPYZI', // テスト送信者アドレス
        exchangeRate: rateInfo.rate,
        baseCurrency: rateInfo.toCurrency,
        baseCurrencyAmount: baseCurrencyAmount,
        rateProvider: rateInfo.provider,
        rateTimestamp: new Date(rateInfo.timestamp)
      }
    })
    
    console.log('✅ 決済確認完了!')
    console.log('新しいステータス:', updatedPayment.status)
    console.log('取引ハッシュ:', updatedPayment.transactionId)
    console.log('保存された為替レート:', updatedPayment.exchangeRate?.toString())
    console.log('保存された基軸通貨金額:', updatedPayment.baseCurrencyAmount?.toString())
    
    console.log('')
    console.log('📱 完了ページURL:')
    console.log(`http://localhost:3001/payment/${payment.paymentId}/complete`)
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simulatePaymentConfirmation()
