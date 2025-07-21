const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBackgroundMonitoring() {
  try {
    console.log('=== バックグラウンド監視テスト ===')
      // 新しいテスト決済を作成
    const testPayment = await prisma.payment.create({
      data: {
        paymentId: `TEST-${Date.now()}`,
        productId: 'cmccvpxow0005b4oklwz1yicb', // 既存の商品IDを使用
        amount: 1000000, // 1 XYM in μXYM
        addressId: 'cmca6s17b0001b4pwn78q8yz4', // 既存のアドレスIDを使用
        status: 'pending',
        expireAt: new Date(Date.now() + 30 * 60 * 1000), // 30分後
        formData: JSON.stringify({})
      },
      include: {
        address: true
      }
    })
    
    console.log('新しい決済を作成しました:')
    console.log('- paymentId:', testPayment.paymentId)
    console.log('- amount:', testPayment.amount, 'μXYM')
    console.log('- address:', testPayment.address.address)
    console.log('- expireAt:', testPayment.expireAt)
    
    console.log('\n=== Status API テスト (30秒間隔で5回) ===')
    console.log('この決済に対してXYM送金を行い、Status APIで検知されるかテストします')
    console.log('手動送金用情報:')
    console.log(`- 送金先: ${testPayment.address.address}`)
    console.log(`- 金額: 1 XYM`)
    console.log(`- メッセージ: ${testPayment.paymentId}`)
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\n--- ${i}/5 回目のチェック ---`)
      
      try {
        const response = await fetch(`http://localhost:3000/api/payment/status/${testPayment.paymentId}`)
        const data = await response.json()
        
        console.log('Status:', data.status)
        if (data.status === 'confirmed') {
          console.log('✅ 決済確認済み！')
          console.log('TransactionId:', data.transactionId)
          console.log('ConfirmedAt:', data.confirmedAt)
          break
        } else {
          console.log('⏰ まだ未確認')
        }
      } catch (error) {
        console.error('Status API エラー:', error.message)
      }
      
      if (i < 5) {
        console.log('30秒待機中...')
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }
    
    console.log('\n=== テスト完了 ===')
    
  } catch (error) {
    console.error('テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBackgroundMonitoring()
