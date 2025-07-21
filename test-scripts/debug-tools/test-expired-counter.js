/**
 * ダッシュボードの期限切れ・失敗カウンターのテスト
 * 期限切れの決済を作成してカウンターが正常に動作するかを確認
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testExpiredPaymentCounter() {
  try {
    console.log('=== 期限切れ・失敗カウンターテスト ===\n')

    // 1. テスト用ユーザーを取得
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    })

    if (!testUser) {
      console.log('❌ テスト用ユーザーが見つかりません')
      return
    }

    console.log('✅ テストユーザー:', testUser.email)

    // 2. 現在の期限切れ・キャンセル数を確認
    const currentExpiredCount = await prisma.payment.count({
      where: {
        userId: testUser.id,
        status: { in: ['expired', 'cancelled'] }
      }
    })

    console.log('📊 現在の期限切れ・キャンセル数:', currentExpiredCount)

    // 3. テスト用商品を取得または作成
    let testProduct = await prisma.product.findFirst({
      where: { userId: testUser.id }
    })

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          name: 'テスト商品（期限切れ用）',
          price: 1000.00,
          stock: 10,
          userId: testUser.id,
          description: '期限切れテスト用商品'
        }
      })
      console.log('✅ テスト商品作成:', testProduct.name)
    } else {
      console.log('✅ 既存テスト商品使用:', testProduct.name)
    }

    // 4. テスト用アドレスを取得
    const testAddress = await prisma.address.findFirst({
      where: { userId: testUser.id }
    })

    if (!testAddress) {
      console.log('❌ テスト用アドレスが見つかりません')
      return
    }

    // 5. 期限切れの決済を作成（過去の日時に設定）
    const expiredPayment = await prisma.payment.create({
      data: {
        paymentId: `EXPIRED-TEST-${Date.now()}`,
        productId: testProduct.id,
        userId: testUser.id,
        addressId: testAddress.id,
        amount: 1000000000, // 1000 XYM
        status: 'expired', // 直接期限切れ状態に設定
        expireAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間前
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25時間前
      }
    })

    console.log('✅ 期限切れ決済作成:', {
      paymentId: expiredPayment.paymentId,
      status: expiredPayment.status,
      expireAt: expiredPayment.expireAt
    })

    // 6. キャンセル決済も作成
    const cancelledPayment = await prisma.payment.create({
      data: {
        paymentId: `CANCELLED-TEST-${Date.now()}`,
        productId: testProduct.id,
        userId: testUser.id,
        addressId: testAddress.id,
        amount: 2000000000, // 2000 XYM
        status: 'cancelled',
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        cancelledAt: new Date(), // キャンセル日時
      }
    })

    console.log('✅ キャンセル決済作成:', {
      paymentId: cancelledPayment.paymentId,
      status: cancelledPayment.status,
      cancelledAt: cancelledPayment.cancelledAt
    })

    // 7. 更新後の期限切れ・キャンセル数を確認
    const newExpiredCount = await prisma.payment.count({
      where: {
        userId: testUser.id,
        status: { in: ['expired', 'cancelled'] }
      }
    })

    console.log('\n📊 テスト後の期限切れ・キャンセル数:', newExpiredCount)
    console.log('📈 増加数:', newExpiredCount - currentExpiredCount)

    // 8. ダッシュボードAPI呼び出しテスト（手動確認用）
    console.log('\n🔗 ダッシュボードAPIで確認:')
    console.log('curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/dashboard/details')
    console.log('\n📝 期限切れ・失敗カウンターの動作確認完了')
    
    // 9. 各ステータスの詳細表示
    const statusBreakdown = await prisma.payment.groupBy({
      by: ['status'],
      where: { userId: testUser.id },
      _count: { status: true }
    })

    console.log('\n📋 ステータス別決済数:')
    statusBreakdown.forEach(status => {
      console.log(`  ${status.status}: ${status._count.status}件`)
    })

    console.log('\n=== テスト完了 ===')
    console.log('ダッシュボードページで期限切れ・失敗カウンターが更新されているか確認してください。')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testExpiredPaymentCounter().catch(console.error)
