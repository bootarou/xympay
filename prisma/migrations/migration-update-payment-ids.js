/**
 * 既存の決済データの決済ID（UUID形式）を新しい8桁英数字形式に変換するマイグレーションスクリプト
 * 
 * 実行方法:
 * node prisma/migrations/migration-update-payment-ids.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// 8桁のランダム英数字を生成する関数
function generateShortPaymentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 重複しない決済IDを生成する関数
async function generateUniquePaymentId() {
  let paymentId
  let isUnique = false
  
  while (!isUnique) {
    paymentId = generateShortPaymentId()
    
    // データベースで重複チェック
    const existing = await prisma.payment.findUnique({
      where: { paymentId }
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  
  return paymentId
}

async function migratePaymentIds() {
  try {
    console.log('🚀 決済ID変換マイグレーション開始...')
    
    // UUID形式の決済IDを持つレコードを取得（UUID形式は36文字）
    const paymentsToUpdate = await prisma.payment.findMany({
      where: {
        paymentId: {
          contains: '-' // UUIDにはハイフンが含まれる
        }
      },
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true
      }
    })
    
    console.log(`📊 変換対象の決済データ数: ${paymentsToUpdate.length}件`)
    
    if (paymentsToUpdate.length === 0) {
      console.log('✅ 変換対象のデータがありません。')
      return
    }
    
    console.log('📝 変換対象データの例:')
    paymentsToUpdate.slice(0, 3).forEach((payment, index) => {
      console.log(`  ${index + 1}. ID: ${payment.id}, 現在の決済ID: ${payment.paymentId}, ステータス: ${payment.status}`)
    })
    
    // 確認プロンプト
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise((resolve) => {
      rl.question('\n⚠️  このマイグレーションを実行しますか？ (yes/no): ', resolve)
    })
    
    rl.close()
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ マイグレーションがキャンセルされました。')
      return
    }
    
    console.log('\n🔄 決済ID変換中...')
    
    let successCount = 0
    let errorCount = 0
    
    // バッチ処理で決済IDを更新
    for (const payment of paymentsToUpdate) {
      try {
        const newPaymentId = await generateUniquePaymentId()
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: { paymentId: newPaymentId }
        })
        
        console.log(`✅ 更新完了: ${payment.paymentId} → ${newPaymentId}`)
        successCount++
        
      } catch (error) {
        console.error(`❌ 更新エラー (ID: ${payment.id}):`, error.message)
        errorCount++
      }
    }
    
    console.log('\n📈 マイグレーション結果:')
    console.log(`  ✅ 成功: ${successCount}件`)
    console.log(`  ❌ エラー: ${errorCount}件`)
    
    if (errorCount === 0) {
      console.log('\n🎉 全ての決済IDの変換が完了しました！')
    } else {
      console.log('\n⚠️  一部のデータでエラーが発生しました。ログを確認してください。')
    }
    
    // 変換後のデータ確認
    console.log('\n🔍 変換後のデータ確認...')
    const updatedPayments = await prisma.payment.findMany({
      where: {
        id: {
          in: paymentsToUpdate.map(p => p.id)
        }
      },
      select: {
        id: true,
        paymentId: true,
        status: true
      }
    })
    
    console.log('📋 変換後のデータ例:')
    updatedPayments.slice(0, 3).forEach((payment, index) => {
      console.log(`  ${index + 1}. ID: ${payment.id}, 新しい決済ID: ${payment.paymentId}, ステータス: ${payment.status}`)
    })
    
  } catch (error) {
    console.error('💥 マイグレーションエラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
if (require.main === module) {
  migratePaymentIds()
    .then(() => {
      console.log('\n✨ マイグレーションスクリプト終了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 マイグレーション失敗:', error)
      process.exit(1)
    })
}

module.exports = { migratePaymentIds, generateShortPaymentId, generateUniquePaymentId }
