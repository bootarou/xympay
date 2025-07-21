const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkExistingData() {
  try {
    console.log('=== 既存データ確認 ===')
    
    // 商品を確認
    const products = await prisma.product.findMany()
    console.log('商品一覧:')
    products.forEach(product => {
      console.log(`- ID: ${product.id}, 名前: ${product.name}, 価格: ${product.price}`)
    })
    
    // アドレスを確認
    const addresses = await prisma.address.findMany()
    console.log('\nアドレス一覧:')
    addresses.forEach(address => {
      console.log(`- ID: ${address.id}, アドレス: ${address.address}`)
    })
    
    // 既存の決済を確認
    const payments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    console.log('\n最新の決済5件:')
    payments.forEach(payment => {
      console.log(`- ID: ${payment.paymentId}, 商品ID: ${payment.productId}, アドレスID: ${payment.addressId}, ステータス: ${payment.status}`)
    })
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExistingData()
