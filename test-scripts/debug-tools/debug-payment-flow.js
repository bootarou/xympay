require('dotenv').config()

async function debugPaymentFlow() {
  console.log('=== 着金検知後のデータフロー調査 ===\n')

  // 設定環境の確認
  console.log('🔍 環境設定確認:')
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '設定済み' : '未設定')
  console.log('SYMBOL_NODE_PRIMARY_URL:', process.env.SYMBOL_NODE_PRIMARY_URL || 'デフォルト')
  console.log('')

  try {
    // PrismaClient の動的インポート
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    console.log('📊 決済データベース状況確認:')

    // 最近の決済状況を取得
    const recentPayments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        paymentId: true,
        status: true,
        amount: true,
        transactionId: true,
        senderAddress: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`最近の決済件数: ${recentPayments.length}件\n`)

    if (recentPayments.length > 0) {
      recentPayments.forEach((payment, index) => {
        console.log(`${index + 1}. 決済ID: ${payment.paymentId}`)
        console.log(`   ステータス: ${payment.status}`)
        console.log(`   商品: ${payment.product.name}`)
        console.log(`   金額: ${payment.amount}`)
        console.log(`   作成日時: ${payment.createdAt.toISOString()}`)
        console.log(`   更新日時: ${payment.updatedAt.toISOString()}`)
        
        if (payment.status === 'confirmed') {
          console.log(`   ✅ 確認日時: ${payment.confirmedAt?.toISOString() || 'なし'}`)
          console.log(`   🔗 取引ID: ${payment.transactionId || 'なし'}`)
          console.log(`   👤 送信者: ${payment.senderAddress || 'なし'}`)
        }
        console.log('')
      })

      // ステータス別の統計
      const statusCount = {
        pending: recentPayments.filter(p => p.status === 'pending').length,
        confirmed: recentPayments.filter(p => p.status === 'confirmed').length,
        expired: recentPayments.filter(p => p.status === 'expired').length,
        cancelled: recentPayments.filter(p => p.status === 'cancelled').length
      }

      console.log('📈 ステータス別統計:')
      console.log(`  待機中: ${statusCount.pending}件`)
      console.log(`  確認済み: ${statusCount.confirmed}件`)
      console.log(`  期限切れ: ${statusCount.expired}件`)
      console.log(`  キャンセル: ${statusCount.cancelled}件`)

      // 着金検知されているがフロントエンドで反映されていない可能性をチェック
      const confirmedButRecent = recentPayments.filter(p => 
        p.status === 'confirmed' && 
        p.confirmedAt && 
        new Date(p.confirmedAt).getTime() > Date.now() - 3600000 // 1時間以内
      )

      if (confirmedButRecent.length > 0) {
        console.log('\n⚠️  最近確認された決済（1時間以内）:')
        confirmedButRecent.forEach(payment => {
          console.log(`  - ${payment.paymentId}: ${payment.product.name}`)
          console.log(`    確認時刻: ${payment.confirmedAt?.toISOString()}`)
          console.log(`    取引ID: ${payment.transactionId}`)
        })
        console.log('\n💡 これらの決済がフロントエンドで反映されていない場合、')
        console.log('   フロントエンドの更新機能に問題がある可能性があります。')
      }

    } else {
      console.log('❌ 決済データが見つかりません')
      console.log('💡 まず決済を作成してテストしてください')
    }

    await prisma.$disconnect()

  } catch (error) {
    console.error('❌ データベース接続エラー:', error)
    console.log('\n🔧 対処法:')
    console.log('1. DATABASE_URL が正しく設定されているか確認')
    console.log('2. PostgreSQL サーバーが起動しているか確認')
    console.log('3. npx prisma generate を実行')
    console.log('4. npx prisma db push を実行')
  }

  console.log('\n🔍 次の調査ステップ:')
  console.log('1. 決済画面を開いてブラウザのコンソールログを確認')
  console.log('2. SSE接続状況を Developer Tools > Network タブで確認')
  console.log('3. /api/payment/status/[paymentId] の応答を確認')
  console.log('4. 実際に決済してリアルタイム更新をテスト')
}

debugPaymentFlow().catch(console.error)
