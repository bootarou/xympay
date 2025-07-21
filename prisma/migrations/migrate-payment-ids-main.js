/**
 * 決済ID形式変更のメインマイグレーションスクリプト
 * バックアップ → マイグレーション → 検証の流れを実行
 * 
 * 実行方法:
 * node prisma/migrations/migrate-payment-ids-main.js
 */

const { backupPaymentData } = require('./backup-payment-data')
const { migratePaymentIds } = require('./migration-update-payment-ids')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function validateMigration() {
  try {
    console.log('\n🔍 マイグレーション結果の検証開始...')
    
    // すべての決済データを取得
    const allPayments = await prisma.payment.findMany({
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true
      }
    })
    
    // UUID形式（ハイフン含む）と短縮形式に分類
    const uuidPayments = allPayments.filter(p => p.paymentId.includes('-'))
    const shortPayments = allPayments.filter(p => !p.paymentId.includes('-'))
    
    console.log('📊 検証結果:')
    console.log(`  📋 総決済数: ${allPayments.length}件`)
    console.log(`  🆔 UUID形式の決済ID: ${uuidPayments.length}件`)
    console.log(`  🔤 短縮形式の決済ID: ${shortPayments.length}件`)
    
    // 短縮形式の決済IDの検証
    const invalidShortIds = shortPayments.filter(p => {
      const id = p.paymentId
      return id.length !== 8 || !/^[A-Z0-9]+$/.test(id)
    })
    
    console.log(`  ✅ 有効な短縮形式: ${shortPayments.length - invalidShortIds.length}件`)
    console.log(`  ❌ 無効な短縮形式: ${invalidShortIds.length}件`)
    
    if (invalidShortIds.length > 0) {
      console.log('\n⚠️  無効な短縮形式の決済ID:')
      invalidShortIds.forEach(payment => {
        console.log(`    ID: ${payment.id}, 決済ID: ${payment.paymentId}`)
      })
    }
    
    // 重複チェック
    const paymentIds = allPayments.map(p => p.paymentId)
    const uniquePaymentIds = new Set(paymentIds)
    const duplicateCount = paymentIds.length - uniquePaymentIds.size
    
    console.log(`  🔄 重複チェック: ${duplicateCount}件の重複`)
    
    if (duplicateCount > 0) {
      const duplicates = paymentIds.filter((id, index) => paymentIds.indexOf(id) !== index)
      console.log('⚠️  重複している決済ID:', [...new Set(duplicates)])
    }
    
    // 最新の短縮形式IDサンプル表示
    if (shortPayments.length > 0) {
      console.log('\n📋 短縮形式決済IDサンプル:')
      shortPayments.slice(0, 5).forEach((payment, index) => {
        console.log(`  ${index + 1}. ${payment.paymentId} (${payment.status})`)
      })
    }
    
    // 検証結果のサマリー
    if (uuidPayments.length === 0 && invalidShortIds.length === 0 && duplicateCount === 0) {
      console.log('\n🎉 マイグレーション完全成功！')
      console.log('   ✅ すべての決済IDが新しい8桁英数字形式に変換されました')
      console.log('   ✅ フォーマットエラーなし')
      console.log('   ✅ 重複なし')
      return true
    } else {
      console.log('\n⚠️  マイグレーションに問題があります:')
      if (uuidPayments.length > 0) {
        console.log(`   ❌ ${uuidPayments.length}件のUUID形式が残っています`)
      }
      if (invalidShortIds.length > 0) {
        console.log(`   ❌ ${invalidShortIds.length}件の無効な短縮形式があります`)
      }
      if (duplicateCount > 0) {
        console.log(`   ❌ ${duplicateCount}件の重複があります`)
      }
      return false
    }
    
  } catch (error) {
    console.error('💥 検証エラー:', error)
    return false
  }
}

async function mainMigration() {
  let backupFile = null
  
  try {
    console.log('🚀 決済ID形式変更マイグレーション開始')
    console.log('=' .repeat(50))
    
    // Step 1: データベース接続確認
    console.log('\n📡 データベース接続確認...')
    await prisma.$connect()
    console.log('✅ データベース接続成功')
    
    // Step 2: 現在の決済データ状況確認
    console.log('\n📊 現在のデータ状況確認...')
    const currentPayments = await prisma.payment.findMany({
      select: { paymentId: true }
    })
    
    const uuidCount = currentPayments.filter(p => p.paymentId.includes('-')).length
    const shortCount = currentPayments.filter(p => !p.paymentId.includes('-')).length
    
    console.log(`   📋 総決済数: ${currentPayments.length}件`)
    console.log(`   🆔 UUID形式: ${uuidCount}件`)
    console.log(`   🔤 短縮形式: ${shortCount}件`)
    
    if (uuidCount === 0) {
      console.log('\n✅ 変換対象のUUID形式決済IDがありません。マイグレーション不要です。')
      return
    }
    
    // Step 3: バックアップ作成
    console.log('\n💾 Step 1: データバックアップ作成')
    console.log('-'.repeat(30))
    backupFile = await backupPaymentData()
    console.log(`✅ バックアップ完了: ${backupFile}`)
    
    // Step 4: マイグレーション実行
    console.log('\n🔄 Step 2: 決済IDマイグレーション実行')
    console.log('-'.repeat(30))
    await migratePaymentIds()
    console.log('✅ マイグレーション完了')
    
    // Step 5: 検証
    console.log('\n🔍 Step 3: マイグレーション結果検証')
    console.log('-'.repeat(30))
    const isValid = await validateMigration()
    
    if (isValid) {
      console.log('\n🎉 マイグレーション全工程完了！')
      console.log('=' .repeat(50))
      console.log('✅ バックアップ作成済み')
      console.log('✅ 決済ID変換完了')
      console.log('✅ 検証成功')
      console.log(`💾 バックアップファイル: ${backupFile}`)
    } else {
      console.log('\n⚠️  マイグレーションに問題があります。')
      console.log('バックアップから復元することを検討してください。')
      console.log(`💾 バックアップファイル: ${backupFile}`)
      console.log('復元コマンド: node prisma/migrations/restore-payment-data.js ' + backupFile)
    }
    
  } catch (error) {
    console.error('\n💥 マイグレーション失敗:', error)
    
    if (backupFile) {
      console.log('\n🔄 バックアップからの復元を検討してください:')
      console.log(`node prisma/migrations/restore-payment-data.js ${backupFile}`)
    }
    
    throw error
    
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
if (require.main === module) {
  mainMigration()
    .then(() => {
      console.log('\n✨ メインマイグレーションスクリプト終了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 メインマイグレーション失敗:', error)
      process.exit(1)
    })
}

module.exports = { mainMigration, validateMigration }
