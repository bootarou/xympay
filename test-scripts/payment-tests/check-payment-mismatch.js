const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPaymentMismatch() {
  try {
    console.log('=== 決済ID不一致の調査 ===')
    console.log('')
    
    console.log('📸 スクリーンショットから確認された情報:')
    console.log('- 送金されたメッセージ: Z0BY4UEW')
    console.log('- システムが期待するメッセージ: E0TTPXLC')
    console.log('- 送金先アドレス: TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY')
    console.log('- 送金金額: 2 XYM')
    console.log('')
    
    // 1. Z0BY4UEWの決済を検索
    console.log('1. 送金されたメッセージ(Z0BY4UEW)の決済を検索...')
    const sentPayment = await prisma.payment.findUnique({
      where: { paymentId: 'Z0BY4UEW' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (sentPayment) {
      console.log('✅ Z0BY4UEWの決済が見つかりました:')
      console.log('決済ID:', sentPayment.paymentId)
      console.log('ステータス:', sentPayment.status)
      console.log('金額 (μXYM):', sentPayment.amount)
      console.log('受取アドレス:', sentPayment.address.address)
      console.log('期限:', sentPayment.expireAt.toISOString())
      console.log('期限切れ？:', new Date() > sentPayment.expireAt ? 'YES' : 'NO')
    } else {
      console.log('❌ Z0BY4UEWの決済が見つかりません')
    }
    console.log('')
    
    // 2. E0TTPXLCの決済を検索
    console.log('2. システムが期待する決済(E0TTPXLC)を検索...')
    const expectedPayment = await prisma.payment.findUnique({
      where: { paymentId: 'E0TTPXLC' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (expectedPayment) {
      console.log('✅ E0TTPXLCの決済が見つかりました:')
      console.log('決済ID:', expectedPayment.paymentId)
      console.log('ステータス:', expectedPayment.status)
      console.log('金額 (μXYM):', expectedPayment.amount)
      console.log('受取アドレス:', expectedPayment.address.address)
      console.log('期限:', expectedPayment.expireAt.toISOString())
      console.log('期限切れ？:', new Date() > expectedPayment.expireAt ? 'YES' : 'NO')
    } else {
      console.log('❌ E0TTPXLCの決済が見つかりません')
    }
    console.log('')
    
    // 3. どちらか一方が有効な場合の対処法を提案
    if (sentPayment && !expectedPayment) {
      console.log('💡 対処法: Z0BY4UEWの決済に対して監視を行う')
      console.log('監視URL:', `http://localhost:3000/api/payment/monitor/Z0BY4UEW`)
      console.log('ステータス確認URL:', `http://localhost:3000/api/payment/status/Z0BY4UEW`)
    } else if (!sentPayment && expectedPayment) {
      console.log('💡 対処法: 正しいメッセージ(E0TTPXLC)で再送金する')
      console.log('送金情報:')
      console.log('- 送金先:', expectedPayment.address.address)
      console.log('- 金額:', Number(expectedPayment.amount) / 1000000, 'XYM')
      console.log('- メッセージ: E0TTPXLC')
    } else if (sentPayment && expectedPayment) {
      console.log('💡 両方の決済が存在します。どちらを使用するか確認してください。')
    } else {
      console.log('💡 両方の決済が見つかりません。新しい決済を作成する必要があります。')
    }
    
    console.log('')
    console.log('=== 最新の有効な決済 ===')
    const validPayments = await prisma.payment.findMany({
      where: {
        expireAt: {
          gt: new Date()
        },
        status: 'pending'
      },
      include: {
        product: true,
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    })
    
    if (validPayments.length > 0) {
      console.log('現在有効な決済:')
      for (const p of validPayments) {
        console.log(`- ${p.paymentId}: ${Number(p.amount) / 1000000} XYM (期限: ${p.expireAt.toISOString()})`)
      }
    } else {
      console.log('現在有効な決済がありません。新しい決済を作成してください。')
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPaymentMismatch()
