const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function analyzeTimestamps() {
  try {
    console.log('=== 時刻分析 ===')
    
    const payment = await prisma.payment.findUnique({
      where: { paymentId: 'Z0BY4UEW' }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    const createdAt = new Date(payment.createdAt)
    const expireAt = new Date(payment.expireAt)
    const now = new Date()
    
    console.log('📅 時刻詳細分析:')
    console.log('')
    
    console.log('作成時刻 (UTC):', createdAt.toISOString())
    console.log('作成時刻 (JST):', createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    console.log('')
    
    console.log('期限時刻 (UTC):', expireAt.toISOString())
    console.log('期限時刻 (JST):', expireAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    console.log('')
    
    console.log('現在時刻 (UTC):', now.toISOString())
    console.log('現在時刻 (JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    console.log('')
    
    // 時間差を計算
    const createdToExpire = (expireAt.getTime() - createdAt.getTime()) / (1000 * 60) // 分
    const createdToNow = (now.getTime() - createdAt.getTime()) / (1000 * 60) // 分
    const expireToNow = (now.getTime() - expireAt.getTime()) / (1000 * 60) // 分
    
    console.log('⏱️  時間差分析:')
    console.log(`作成〜期限: ${createdToExpire.toFixed(1)} 分`)
    console.log(`作成〜現在: ${createdToNow.toFixed(1)} 分`)
    console.log(`期限〜現在: ${expireToNow.toFixed(1)} 分 ${expireToNow > 0 ? '(期限切れ)' : '(有効)'}`)
    console.log('')
    
    // システム時刻と実際の経過時間を比較
    console.log('🔍 時刻問題の分析:')
    if (createdToNow < 10 && expireToNow > 20) {
      console.log('⚠️  問題発見: 実際の経過時間は約5分なのに、システムでは25分経過したことになっています')
      console.log('可能な原因:')
      console.log('1. サーバーの時刻設定が間違っている')
      console.log('2. タイムゾーンの設定問題')
      console.log('3. データベースの時刻設定問題')
      console.log('4. 決済作成時の時刻計算ミス')
    } else if (createdToExpire !== 30) {
      console.log(`⚠️  期限設定問題: 期限は30分後のはずですが、実際は${createdToExpire.toFixed(1)}分後になっています`)
    } else {
      console.log('✅ 時刻設定は正常です')
    }
    
    console.log('')
    console.log('🛠️  対処法:')
    console.log('1. この決済の期限を現在時刻から30分後に延長する')
    console.log('2. 新しい決済を正しい時刻で作成する')
    console.log('3. サーバーの時刻設定を確認する')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeTimestamps()
