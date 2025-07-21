/**
 * バックアップからデータを復元するスクリプト
 * 
 * 実行方法:
 * node prisma/migrations/restore-payment-data.js [backup-file-path]
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function restorePaymentData(backupFilePath) {
  try {
    console.log('🔄 決済データの復元開始...')
    
    // バックアップファイルの存在確認
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`バックアップファイルが見つかりません: ${backupFilePath}`)
    }
    
    // バックアップデータを読み込み
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'))
    
    console.log(`📁 バックアップファイル: ${backupFilePath}`)
    console.log(`📅 バックアップ日時: ${backupData.timestamp}`)
    console.log(`📊 レコード数: ${backupData.totalRecords}件`)
    
    if (!backupData.payments || backupData.payments.length === 0) {
      console.log('⚠️  復元対象のデータがありません。')
      return
    }
    
    // 確認プロンプト
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise((resolve) => {
      rl.question('\n⚠️  このバックアップから復元しますか？ (yes/no): ', resolve)
    })
    
    rl.close()
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ 復元がキャンセルされました。')
      return
    }
    
    console.log('\n🔄 データ復元中...')
    
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    // バックアップデータから決済IDを復元
    for (const backupPayment of backupData.payments) {
      try {
        // 現在のデータベースで該当レコードを検索
        const existingPayment = await prisma.payment.findUnique({
          where: { id: backupPayment.id }
        })
        
        if (!existingPayment) {
          console.log(`⚠️  レコードが見つかりません (ID: ${backupPayment.id}). スキップします。`)
          skippedCount++
          continue
        }
        
        // 決済IDを元に戻す
        await prisma.payment.update({
          where: { id: backupPayment.id },
          data: { 
            paymentId: backupPayment.paymentId
          }
        })
        
        console.log(`✅ 復元完了: ID ${backupPayment.id} → 決済ID ${backupPayment.paymentId}`)
        successCount++
        
      } catch (error) {
        console.error(`❌ 復元エラー (ID: ${backupPayment.id}):`, error.message)
        errorCount++
      }
    }
    
    console.log('\n📈 復元結果:')
    console.log(`  ✅ 成功: ${successCount}件`)
    console.log(`  ❌ エラー: ${errorCount}件`)
    console.log(`  ⏭️  スキップ: ${skippedCount}件`)
    
    if (errorCount === 0) {
      console.log('\n🎉 データの復元が完了しました！')
    } else {
      console.log('\n⚠️  一部のデータでエラーが発生しました。ログを確認してください。')
    }
    
  } catch (error) {
    console.error('💥 復元エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 利用可能なバックアップファイルを一覧表示
async function listBackupFiles() {
  const backupDir = path.join(__dirname, 'backups')
  
  if (!fs.existsSync(backupDir)) {
    console.log('📁 バックアップディレクトリが見つかりません。')
    return []
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('payment-data-backup-') && file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      }
    })
    .sort((a, b) => b.modified - a.modified)
  
  console.log('📋 利用可能なバックアップファイル:')
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`)
    console.log(`     📅 作成日時: ${file.modified.toISOString()}`)
    console.log(`     📏 サイズ: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
    console.log('')
  })
  
  return files
}

// スクリプト実行
if (require.main === module) {
  const backupFilePath = process.argv[2]
  
  if (!backupFilePath) {
    console.log('使用方法: node restore-payment-data.js [backup-file-path]')
    console.log('')
    
    listBackupFiles()
      .then(() => {
        console.log('復元したいバックアップファイルのパスを指定してください。')
        process.exit(1)
      })
      .catch(error => {
        console.error('エラー:', error)
        process.exit(1)
      })
  } else {
    restorePaymentData(backupFilePath)
      .then(() => {
        console.log('\n✨ 復元スクリプト終了')
        process.exit(0)
      })
      .catch((error) => {
        console.error('\n💥 復元失敗:', error)
        process.exit(1)
      })
  }
}

module.exports = { restorePaymentData, listBackupFiles }
