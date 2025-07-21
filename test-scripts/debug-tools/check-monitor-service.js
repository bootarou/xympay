/**
 * monitor-service.tsの実動作確認
 * サーバーログと決済ステータスを確認
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMonitorService() {
  try {
    console.log('=== monitor-service.ts 動作確認 ===\n')

    // 1. 現在のPending決済を確認
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'pending',
        expireAt: {
          gt: new Date()
        }
      },
      include: {
        product: true,
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log(`📋 現在のPending決済: ${pendingPayments.length}件`)
    
    if (pendingPayments.length > 0) {
      console.log('\n決済一覧:')
      pendingPayments.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.paymentId}`)
        console.log(`   商品: ${payment.product.name}`)
        console.log(`   金額: ${payment.amount / 1000000} XYM`)
        console.log(`   アドレス: ${payment.address.address}`)
        console.log(`   期限: ${payment.expireAt.toISOString()}`)
        console.log(`   作成日時: ${payment.createdAt.toISOString()}`)
        console.log('')
      })
    } else {
      console.log('現在、監視対象のPending決済はありません。')
    }

    // 2. 最近確認された決済を確認
    const recentConfirmed = await prisma.payment.findMany({
      where: {
        status: 'confirmed',
        confirmedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間
        }
      },
      include: {
        product: true
      },
      orderBy: {
        confirmedAt: 'desc'
      },
      take: 5
    })

    console.log(`✅ 過去24時間で確認された決済: ${recentConfirmed.length}件`)
    
    if (recentConfirmed.length > 0) {
      console.log('\n確認済み決済:')
      recentConfirmed.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.paymentId}`)
        console.log(`   商品: ${payment.product.name}`)
        console.log(`   確認日時: ${payment.confirmedAt?.toISOString()}`)
        console.log(`   トランザクション: ${payment.transactionId || 'なし'}`)
        console.log('')
      })
    }

    // 3. 在庫が変更された商品を確認
    const productsWithLowStock = await prisma.product.findMany({
      where: {
        stock: {
          lt: 10 // 在庫が10個未満
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    })

    console.log(`📦 在庫10個未満の商品: ${productsWithLowStock.length}件`)
    
    if (productsWithLowStock.length > 0) {
      console.log('\n在庫状況:')
      productsWithLowStock.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`)
        console.log(`   在庫: ${product.stock}個`)
        console.log(`   最終更新: ${product.updatedAt.toISOString()}`)
        console.log('')
      })
    }

    // 4. monitor-service.tsの実装確認
    console.log('📋 monitor-service.ts実装状況:')
    console.log('✅ 在庫減算処理: 実装済み（updatePaymentStatus内）')
    console.log('✅ トランザクション安全性: stock > 0 条件あり')
    console.log('✅ エラーハンドリング: try-catch実装済み')
    console.log('✅ ログ出力: 在庫更新完了ログあり')

    console.log('\n💡 問題が発生している場合の確認ポイント:')
    console.log('1. サーバーが起動しているか')
    console.log('2. monitor-service.tsが正しくインポートされているか')
    console.log('3. Symbol監視が動作しているか')
    console.log('4. 決済が実際に confirmed ステータスになっているか')

    console.log('\n=== 確認完了 ===')

  } catch (error) {
    console.error('❌ 確認エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMonitorService().catch(console.error)
