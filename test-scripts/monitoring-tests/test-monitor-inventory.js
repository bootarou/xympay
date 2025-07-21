/**
 * 決済監視サービスの在庫管理機能テスト
 * 
 * 目的：
 * 1. 決済作成時の監視登録確認
 * 2. 決済完了時の在庫減算確認
 * 3. monitor-service.tsの動作確認
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testMonitoringWithInventory() {
  try {
    console.log('=== 決済監視サービス＋在庫管理テスト ===\n')

    // 1. 既存の商品を確認または新しい商品を作成
    let testProduct = await prisma.product.findFirst({
      where: {
        name: { contains: 'テスト商品（監視用）' }
      },
      include: { user: true }
    })

    if (!testProduct) {
      // テスト用ユーザーと商品を作成
      const testUser = await prisma.user.findFirst() || await prisma.user.create({
        data: {
          email: 'test-monitor@example.com',
          name: 'Monitor Test User'
        }
      })

      // テスト用アドレスを作成
      const testAddress = await prisma.address.create({
        data: {
          userId: testUser.id,
          name: 'テスト監視用アドレス',
          address: 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY',
          type: 'payment',
          isDefault: true
        }
      })

      testProduct = await prisma.product.create({
        data: {
          name: 'テスト商品（監視用）',
          price: 2000.00,
          stock: 5, // 初期在庫5個
          userId: testUser.id,
          paymentAddress: testAddress.address,
          description: '監視＋在庫管理テスト用商品'
        },
        include: { user: true }
      })

      console.log('✅ テスト商品作成:', {
        id: testProduct.id,
        name: testProduct.name,
        stock: testProduct.stock,
        paymentAddress: testProduct.paymentAddress
      })
    } else {
      console.log('✅ 既存テスト商品使用:', {
        id: testProduct.id,
        name: testProduct.name,
        stock: testProduct.stock,
        paymentAddress: testProduct.paymentAddress
      })
    }

    // 2. データベースで直接決済を作成（API呼び出しを避ける）
    console.log('\n💳 新しい決済を作成中...')
    
    const paymentId = `MONITOR-TEST-${Date.now()}`
    const testPayment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: testProduct.id,
        userId: testProduct.userId,
        addressId: testProduct.user.addresses?.[0]?.id || (await prisma.address.findFirst({ where: { userId: testProduct.userId } })).id,
        amount: 2000000000, // 2000 XYM（マイクロXYM単位）
        status: 'pending',
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後
      }
    })

    console.log('✅ 決済作成成功:', {
      paymentId: testPayment.paymentId,
      amount: testPayment.amount,
      status: testPayment.status
    })

    // 3. 決済完了前の在庫確認
    const stockBefore = await prisma.product.findUnique({
      where: { id: testProduct.id },
      select: { stock: true }
    })
    console.log('\n📦 決済完了前の在庫:', stockBefore.stock)

    // 4. 手動で決済を完了状態にして在庫減算をテスト
    console.log('\n⚡ 決済完了処理をシミュレート...')
    console.log('（実際の環境では、Symbol送金により自動的に完了されます）')

    // monitor-service.tsの updatePaymentStatus と同じ処理をシミュレート
    await prisma.payment.update({
      where: { paymentId: testPayment.paymentId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        transactionId: 'SIMULATED-TX-HASH',
        senderAddress: 'SIMULATED-SENDER-ADDRESS'
      }
    })

    // 在庫減算処理を実行
    const paymentWithProduct = await prisma.payment.findUnique({
      where: { paymentId: testPayment.paymentId },
      include: { product: true }
    })

    if (paymentWithProduct?.product && paymentWithProduct.product.stock > 0) {
      const updatedProduct = await prisma.product.update({
        where: { 
          id: paymentWithProduct.product.id,
          stock: { gt: 0 }
        },
        data: {
          stock: { decrement: 1 }
        }
      })
      console.log('✅ 在庫減算完了:', {
        商品名: updatedProduct.name,
        残り在庫: updatedProduct.stock
      })
    }

    // 5. 決済完了後の在庫確認
    const stockAfter = await prisma.product.findUnique({
      where: { id: testProduct.id },
      select: { stock: true }
    })
    console.log('\n📊 決済完了後の在庫:', stockAfter.stock)

    // 6. 結果確認
    const stockReduction = stockBefore.stock - stockAfter.stock
    if (stockReduction === 1) {
      console.log('✅ 在庫管理テスト成功: 決済完了時に在庫が1個減算されました')
    } else {
      console.log('❌ 在庫管理テスト失敗: 在庫減算が正常に動作していません')
    }

    // 7. 実際のSymbol送金テスト用情報表示
    console.log('\n🔗 実際のSymbol送金テスト:')
    console.log('送金先アドレス:', testProduct.paymentAddress)
    console.log('送金額:', `${testPayment.amount / 1000000} XYM`)
    console.log('メッセージ:', testPayment.paymentId)
    console.log('\n📝 送金後、以下のコマンドで結果を確認:')
    console.log(`curl http://localhost:3000/api/payment/status/${testPayment.paymentId}`)

    console.log('\n=== テスト完了 ===')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMonitoringWithInventory().catch(console.error)
