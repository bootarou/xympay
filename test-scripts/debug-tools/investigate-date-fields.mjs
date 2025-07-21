#!/usr/bin/env node

/**
 * 取引履歴の日付フィールド調査スクリプト
 * - 表示日付とソート日付の一致確認
 * - デモ商品データの詳細分析
 * - 日付フィールドの整合性チェック
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateDateFields() {
  console.log('🔍 取引履歴の日付フィールド詳細調査\n')

  try {
    // 現在の日付情報
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    console.log('=== 基本情報 ===')
    console.log('現在日時:', now.toLocaleString('ja-JP'))
    console.log('今月開始:', thisMonthStart.toLocaleString('ja-JP'))
    console.log('')

    // 全決済データの詳細確認
    console.log('=== 全決済データの日付フィールド確認 ===')
    const allPayments = await prisma.payment.findMany({
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true,        // 作成日時（表示用？）
        confirmedAt: true,      // 確認日時
        expireAt: true,         // 期限日時
        updatedAt: true,        // 更新日時
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'  // ソート基準
      },
      take: 15
    })

    console.log(`取得データ数: ${allPayments.length}件\n`)

    allPayments.forEach((payment, index) => {
      const createdDate = new Date(payment.createdAt)
      const confirmedDate = payment.confirmedAt ? new Date(payment.confirmedAt) : null
      const isThisMonth = createdDate >= thisMonthStart
      
      console.log(`${index + 1}. PaymentID: ${payment.paymentId}`)
      console.log(`   商品: ${payment.product.name}`)
      console.log(`   ステータス: ${payment.status}`)
      console.log(`   作成日時 (createdAt): ${createdDate.toLocaleString('ja-JP')} ${isThisMonth ? '✅今月' : '❌他月'}`)
      
      if (confirmedDate) {
        const confirmedIsThisMonth = confirmedDate >= thisMonthStart
        console.log(`   確認日時 (confirmedAt): ${confirmedDate.toLocaleString('ja-JP')} ${confirmedIsThisMonth ? '✅今月' : '❌他月'}`)
      } else {
        console.log(`   確認日時 (confirmedAt): null`)
      }
      
      if (payment.expireAt) {
        const expireDate = new Date(payment.expireAt)
        console.log(`   期限日時 (expireAt): ${expireDate.toLocaleString('ja-JP')}`)
      }
      
      console.log('')
    })

    // 今月フィルター適用時のデータ確認
    console.log('=== 今月フィルター適用確認 ===')
    
    // createdAt基準
    const createdAtThisMonth = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: thisMonthStart
        }
      },
      select: {
        paymentId: true,
        status: true,
        createdAt: true,
        product: { select: { name: true } }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`createdAt基準での今月データ: ${createdAtThisMonth.length}件`)
    createdAtThisMonth.forEach(payment => {
      console.log(`  ${payment.paymentId}: ${new Date(payment.createdAt).toLocaleString('ja-JP')} (${payment.status})`)
    })
    console.log('')

    // confirmedAt基準（確認済みのみ）
    const confirmedAtThisMonth = await prisma.payment.findMany({
      where: {
        confirmedAt: {
          gte: thisMonthStart
        },
        status: 'confirmed'
      },
      select: {
        paymentId: true,
        status: true,
        createdAt: true,
        confirmedAt: true,
        product: { select: { name: true } }
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    })

    console.log(`confirmedAt基準での今月データ: ${confirmedAtThisMonth.length}件`)
    confirmedAtThisMonth.forEach(payment => {
      console.log(`  ${payment.paymentId}: 作成=${new Date(payment.createdAt).toLocaleString('ja-JP')}, 確認=${new Date(payment.confirmedAt).toLocaleString('ja-JP')}`)
    })
    console.log('')

    // デモ商品データの特定確認
    console.log('=== デモ商品データ分析 ===')
    const demoProducts = allPayments.filter(p => 
      p.product.name.includes('デモ商品') || 
      p.product.name.includes('test') ||
      p.paymentId.includes('DEMO')
    )

    console.log(`デモ商品関連データ: ${demoProducts.length}件`)
    demoProducts.forEach(payment => {
      const createdDate = new Date(payment.createdAt)
      console.log(`  ${payment.paymentId} (${payment.product.name}): ${createdDate.toLocaleDateString('ja-JP')}`)
    })

  } catch (error) {
    console.error('調査エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function checkAPIImplementation() {
  console.log('\n=== API実装確認 ===')
  
  console.log('取引履歴API (/api/transactions) で使用されているフィールド:')
  console.log('- ソート基準: createdAt desc')
  console.log('- 期間フィルター適用対象: createdAt')
  console.log('- 表示日付: formatDate(transaction.createdAt)')
  console.log('')
  
  console.log('期待される動作:')
  console.log('- 今月フィルター: createdAt >= 2025-07-01 00:00:00')
  console.log('- 表示順序: createdAt の降順')
  console.log('- 表示日付: createdAt をフォーマット')
  console.log('')
  
  console.log('もし他の月のデータが表示される場合の可能性:')
  console.log('1. APIフィルターが正しく適用されていない')
  console.log('2. createdAt と表示日付が異なるフィールドを使用')
  console.log('3. タイムゾーンの問題')
  console.log('4. デモデータの日付が間違って設定されている')
}

async function main() {
  await investigateDateFields()
  await checkAPIImplementation()
  
  console.log('\n🎯 調査完了')
  console.log('この結果を元に、表示されている日付とフィルター/ソートの不整合を特定できます。')
}

main().catch(console.error)
