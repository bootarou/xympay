/**
 * マイグレーション実行前のデータバックアップスクリプト
 * 
 * 実行方法:
 * node prisma/migrations/backup-payment-data.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupPaymentData() {
  try {
    console.log('💾 決済データのバックアップ開始...')
    
    // すべての決済データを取得
    const allPayments = await prisma.payment.findMany({
      include: {
        product: {
          select: {
            id: true,
            uuid: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        },
        address: {
          select: {
            id: true,
            address: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 バックアップ対象の決済データ数: ${allPayments.length}件`)
    
    // バックアップファイル名を生成（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(__dirname, 'backups')
    const backupFile = path.join(backupDir, `payment-data-backup-${timestamp}.json`)
    
    // バックアップディレクトリを作成
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // バックアップデータを準備
    const backupData = {
      timestamp: new Date().toISOString(),
      totalRecords: allPayments.length,
      metadata: {
        purpose: 'Pre-migration backup before payment ID format change',
        fromFormat: 'UUID (36 characters with hyphens)',
        toFormat: '8-character alphanumeric'
      },
      payments: allPayments
    }
    
    // JSONファイルとして保存
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8')
    
    console.log(`✅ バックアップ完了: ${backupFile}`)
    console.log(`📁 ファイルサイズ: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`)
    
    // バックアップ内容の統計情報を表示
    const uuidPayments = allPayments.filter(p => p.paymentId.includes('-'))
    const shortPayments = allPayments.filter(p => !p.paymentId.includes('-'))
    
    console.log('\n📈 バックアップデータ統計:')
    console.log(`  📋 総決済数: ${allPayments.length}件`)
    console.log(`  🆔 UUID形式の決済ID: ${uuidPayments.length}件`)
    console.log(`  🔤 短縮形式の決済ID: ${shortPayments.length}件`)
    
    const statusCounts = {}
    allPayments.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    })
    
    console.log('\n📊 ステータス別統計:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`)
    })
    
    // UUID形式のサンプルを表示
    if (uuidPayments.length > 0) {
      console.log('\n🔍 変換対象のUUID形式決済IDサンプル:')
      uuidPayments.slice(0, 5).forEach((payment, index) => {
        console.log(`  ${index + 1}. ${payment.paymentId} (${payment.status}, ${payment.createdAt.toISOString()})`)
      })
    }
    
    return backupFile
    
  } catch (error) {
    console.error('💥 バックアップエラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
if (require.main === module) {
  backupPaymentData()
    .then((backupFile) => {
      console.log('\n✨ バックアップスクリプト終了')
      console.log(`💾 バックアップファイル: ${backupFile}`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 バックアップ失敗:', error)
      process.exit(1)
    })
}

module.exports = { backupPaymentData }
