const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPaymentStatus() {
  try {
    console.log('=== 決済ステータス確認 ===')
    
    const payment = await prisma.payment.findUnique({
      where: { paymentId: 'Z0BY4UEW' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    console.log('決済ID:', payment.paymentId)
    console.log('ステータス:', payment.status)
    console.log('金額 (μXYM):', payment.amount)
    console.log('金額 (XYM):', Number(payment.amount) / 1000000)
    console.log('受取アドレス:', payment.address.address)
    console.log('作成日時:', payment.createdAt.toISOString())
    console.log('期限:', payment.expireAt.toISOString())
    console.log('確認日時:', payment.confirmedAt?.toISOString() || '未確認')
    console.log('取引ハッシュ:', payment.transactionId || 'なし')
    console.log('')
    
    if (payment.status === 'confirmed') {
      console.log('✅ 決済が確認されました！')
    } else if (payment.status === 'pending') {
      console.log('⏳ 決済は保留中です')
      console.log('送金が正しく行われていれば、数秒〜数分で確認されます')
    } else {
      console.log('⚠️  決済ステータス:', payment.status)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 10秒間隔で3回チェック
let checkCount = 0
const interval = setInterval(async () => {
  checkCount++
  console.log(`\n=== チェック ${checkCount}/3 ===`)
  await checkPaymentStatus()
  
  if (checkCount >= 3) {
    clearInterval(interval)
    console.log('\n=== 監視終了 ===')
    process.exit(0)
  }
}, 10000)

// 最初の1回目をすぐに実行
checkPaymentStatus()
