const { PrismaClient } = require('@prisma/client')

async function testSameAddress() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== 支払い情報の確認 ===')
    
    // 最新の支払い情報を取得
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    if (payments.length === 0) {
      console.log('支払い情報が見つかりません')
      return
    }
    
    console.log(`最新の${payments.length}件の支払い情報:`)
    
    payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Payment ID: ${payment.id}`)
      console.log(`   金額: ${payment.amount} XYM`)
      console.log(`   メッセージ: ${payment.message}`)
      console.log(`   受信者アドレス: ${payment.recipientAddress}`)
      console.log(`   ステータス: ${payment.status}`)
      console.log(`   作成日時: ${payment.createdAt}`)
      
      // 同じアドレスが使われているかチェック（推測）
      if (payment.recipientAddress && payment.recipientAddress.length === 39) {
        console.log(`   アドレス形式: Valid Symbol Address`)
      }
    })
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSameAddress()
