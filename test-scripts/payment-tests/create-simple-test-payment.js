const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestPayment() {
  try {
    console.log('=== テスト決済作成開始 ===')
    
    // 商品を取得または作成
    let product = await prisma.product.findFirst()
    if (!product) {
      console.log('商品が見つからないため、新しい商品を作成します...')
      product = await prisma.product.create({
        data: {
          name: 'テスト商品',
          price: 10.0,
          description: 'テスト用の商品です',
          stock: 100
        }
      })
      console.log('✅ 商品作成完了:', product.name)
    } else {
      console.log('✅ 既存商品を使用:', product.name)
    }
      // アドレスを取得または作成
    let address = await prisma.address.findFirst()
    if (!address) {
      console.log('Addressが見つからないため、新しいアドレスを作成します...')
      // まずユーザーを作成
      let user = await prisma.user.findFirst()
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'test@example.com',
            name: 'テストユーザー'
          }
        })
      }
      
      address = await prisma.address.create({
        data: {
          name: 'テスト用アドレス',
          address: 'NATNE7Q5BITMUTRRN6IB4I7FLSDRDWZA35C4OGI',
          type: 'payment',
          description: 'テスト用のSymbolアドレス',
          userId: user.id
        }
      })
      console.log('✅ アドレス作成完了:', address.address)
    } else {
      console.log('✅ 既存アドレスを使用:', address.address)
    }
    
    // 決済IDを生成
    const paymentId = `test-${Date.now()}`
    
    // 決済を作成
    const payment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: product.id,
        addressId: address.id,
        amount: product.price,
        status: 'pending',
        expireAt: new Date(Date.now() + 15 * 60 * 1000) // 15分後に期限切れ
      },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('🎉 テスト決済作成完了!')
    console.log('決済ID:', payment.paymentId)
    console.log('商品名:', payment.product.name)
    console.log('金額:', payment.amount, 'XYM')
    console.log('受取アドレス:', payment.address.address)
    console.log('期限:', payment.expireAt.toISOString())
    console.log('')
    console.log('📱 決済ページURL:')
    console.log(`http://localhost:3000/payment/${payment.paymentId}`)
    console.log('')
    console.log('🔍 監視API URL:')
    console.log(`http://localhost:3000/api/payment/monitor/${payment.paymentId}`)
    
    return payment
  } catch (error) {
    console.error('❌ テスト決済作成エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestPayment()
