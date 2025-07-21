const { PrismaClient } = require('@prisma/client')

async function manualTransactionCheck() {
  console.log('=== 手動トランザクションチェック ===')
  
  const prisma = new PrismaClient()
  
  try {
    // 最新のpending支払いを取得
    const latestPayment = await prisma.payment.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        address: true,
        product: true
      }
    })
    
    if (!latestPayment) {
      console.log('❌ pending状態の支払いが見つかりません')
      
      // 新しい支払いを作成
      console.log('新しい支払いを作成します...')
      
      // デフォルトアドレスとプロダクトを取得
      const defaultAddress = await prisma.address.findFirst()
      const defaultProduct = await prisma.product.findFirst()
      
      if (!defaultAddress || !defaultProduct) {
        console.log('❌ デフォルトアドレスまたは商品が見つかりません')
        return
      }
      
      // 新しい支払いを作成
      const newPayment = await prisma.payment.create({
        data: {
          paymentId: 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase(),
          productId: defaultProduct.id,
          addressId: defaultAddress.id,
          amount: 2,
          status: 'pending',
          expireAt: new Date(Date.now() + 30 * 60 * 1000) // 30分後
        },
        include: {
          address: true,
          product: true
        }
      })
      
      console.log('✅ 新しい支払いを作成しました:', {
        paymentId: newPayment.paymentId,
        amount: newPayment.amount,
        address: newPayment.address.address
      })
      
      return newPayment
    }
    
    console.log('📋 最新のpending支払い:', {
      paymentId: latestPayment.paymentId,
      amount: latestPayment.amount,
      address: latestPayment.address.address,
      createdAt: latestPayment.createdAt,
      expireAt: latestPayment.expireAt,
      isExpired: latestPayment.expireAt < new Date()
    })
    
    return latestPayment
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function testSymbolMonitorDirectly() {
  console.log('\n=== Symbol Monitor 直接テスト ===')
  
  try {
    // Dynamic import for ES modules
    const { symbolMonitor } = await import('./src/lib/symbol/monitor.js')
    
    const payment = await manualTransactionCheck()
    if (!payment) {
      console.log('❌ 支払い情報の取得に失敗')
      return
    }
    
    console.log('\n🔍 Symbol接続テスト...')
    const isConnected = await symbolMonitor.testConnection()
    
    if (!isConnected) {
      console.log('❌ Symbol接続失敗')
      return
    }
    
    console.log('\n🔍 トランザクション検索テスト...')
    const result = await symbolMonitor.checkConfirmedTransactions(
      payment.address.address,
      payment.paymentId,
      Number(payment.amount),
      payment.createdAt
    )
    
    if (result) {
      console.log('✅ トランザクション発見:', result)
    } else {
      console.log('❌ トランザクション未発見')
    }
    
  } catch (importError) {
    console.error('❌ Import エラー:', importError.message)
    console.log('💡 TypeScriptファイルのビルドが必要な可能性があります')
  }
}

testSymbolMonitorDirectly()
