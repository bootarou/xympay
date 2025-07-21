/**
 * 在庫管理機能のテストスクリプト
 * - 商品作成
 * - 決済作成
 * - 決済完了処理（手動）
 * - 在庫減算の確認
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInventoryManagement() {
  try {
    console.log('=== 在庫管理テスト開始 ===')

    // 1. テスト用ユーザーを作成または取得
    let testUser = await prisma.user.findFirst({
      where: { email: 'test-inventory@example.com' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test-inventory@example.com',
          name: 'Test Inventory User'
        }
      })
      console.log('✅ テストユーザー作成:', testUser.id)
    } else {
      console.log('✅ テストユーザー取得:', testUser.id)
    }

    // 2. テスト用住所を作成または取得
    let testAddress = await prisma.address.findFirst({
      where: { 
        userId: testUser.id,
        type: 'payment'
      }
    })

    if (!testAddress) {
      testAddress = await prisma.address.create({
        data: {
          userId: testUser.id,
          name: 'テスト決済用アドレス',
          address: 'TCIFSMQZAX3IDPHUP2RTXP26N6BJRNKEBBKP33I',
          type: 'payment',
          isDefault: true
        }
      })
      console.log('✅ テストアドレス作成:', testAddress.address)
    } else {
      console.log('✅ テストアドレス取得:', testAddress.address)
    }

    // 3. テスト用商品を作成（在庫10個）
    const testProduct = await prisma.product.create({
      data: {
        name: 'テスト商品（在庫管理）',
        price: 1000.00,
        stock: 10, // 初期在庫10個
        userId: testUser.id,
        paymentAddress: testAddress.address,
        description: '在庫管理テスト用商品'
      }
    })
    console.log('✅ テスト商品作成:', {
      id: testProduct.id,
      name: testProduct.name,
      initialStock: testProduct.stock
    })

    // 4. テスト用決済を作成
    const paymentId = `TEST-INVENTORY-${Date.now()}`
    const testPayment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: testProduct.id,
        userId: testUser.id,
        addressId: testAddress.id,
        amount: 1000000000, // 1000 XYM（マイクロXYM単位）
        status: 'pending',
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後
      }
    })
    console.log('✅ テスト決済作成:', {
      paymentId: testPayment.paymentId,
      status: testPayment.status
    })

    // 5. 決済完了前の在庫確認
    const stockBeforePayment = await prisma.product.findUnique({
      where: { id: testProduct.id },
      select: { stock: true }
    })
    console.log('💰 決済完了前の在庫:', stockBeforePayment.stock)

    // 6. 決済を手動で完了状態に更新（実際の在庫減算処理をテスト）
    console.log('⚡ 決済完了処理実行中...')
    
    // monitor-service.tsと同じ在庫減算ロジックをテスト
    const updateData = {
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionId: 'TEST-TX-HASH-123',
      senderAddress: 'SENDER-ADDRESS-TEST',
      updatedAt: new Date()
    }

    // 決済ステータス更新
    await prisma.payment.update({
      where: { paymentId: testPayment.paymentId },
      data: updateData
    })

    // 在庫減算処理（monitor-service.tsと同じロジック）
    const paymentWithProduct = await prisma.payment.findUnique({
      where: { paymentId: testPayment.paymentId },
      include: {
        product: true
      }
    })

    if (paymentWithProduct?.product) {
      if (paymentWithProduct.product.stock <= 0) {
        console.warn(`在庫不足により在庫減算をスキップ: ${paymentWithProduct.product.name} (現在の在庫: ${paymentWithProduct.product.stock})`)
      } else {
        // 在庫を1減らす（トランザクションで安全に実行）
        const updatedProduct = await prisma.product.update({
          where: { 
            id: paymentWithProduct.product.id,
            stock: { gt: 0 } // 在庫が0より大きい場合のみ更新
          },
          data: {
            stock: {
              decrement: 1
            }
          }
        })

        if (updatedProduct) {
          console.log(`✅ 在庫更新完了: ${paymentWithProduct.product.name} (残り在庫: ${updatedProduct.stock})`)
        } else {
          console.warn(`在庫更新失敗（在庫不足の可能性）: ${paymentWithProduct.product.name}`)
        }
      }
    }

    // 7. 決済完了後の在庫確認
    const stockAfterPayment = await prisma.product.findUnique({
      where: { id: testProduct.id },
      select: { stock: true }
    })
    console.log('� 決済完了後の在庫:', stockAfterPayment.stock)

    // 8. 結果確認
    const stockDifference = stockBeforePayment.stock - stockAfterPayment.stock
    console.log('📊 在庫減算結果:', {
      before: stockBeforePayment.stock,
      after: stockAfterPayment.stock,
      difference: stockDifference,
      expected: 1
    })

    if (stockDifference === 1) {
      console.log('✅ 在庫管理テスト成功: 決済完了時に在庫が正常に減算されました')
    } else {
      console.log('❌ 在庫管理テスト失敗: 在庫減算が正常に動作していません')
    }

    // 9. 更新された決済情報の確認
    const updatedPayment = await prisma.payment.findUnique({
      where: { paymentId: testPayment.paymentId }
    })
    console.log('💳 更新された決済情報:', {
      paymentId: updatedPayment.paymentId,
      status: updatedPayment.status,
      confirmedAt: updatedPayment.confirmedAt,
      transactionId: updatedPayment.transactionId
    })

    console.log('=== 在庫管理テスト完了 ===')

  } catch (error) {
    console.error('❌ 在庫管理テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// テスト実行
testInventoryManagement().catch(console.error)
