#!/usr/bin/env node

/**
 * デモデータの日付修正スクリプト
 * - 未来の日付になっているデモデータを適切な過去の日付に修正
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDemoDataDates() {
  console.log('🔧 デモデータの日付修正開始\n')

  try {
    // 問題のあるデモデータを特定
    const futureDemoData = await prisma.payment.findMany({
      where: {
        OR: [
          { paymentId: { startsWith: 'DEMO_PAST_' } },
          { product: { name: { contains: 'デモ商品' } } }
        ],
        createdAt: {
          gt: new Date() // 現在時刻より未来
        }
      },
      include: {
        product: true
      }
    })

    console.log(`未来の日付を持つデモデータ: ${futureDemoData.length}件`)

    if (futureDemoData.length === 0) {
      console.log('✅ 修正が必要なデータはありません。')
      return
    }

    // 修正用の日付マッピング
    const dateMapping = {
      'DEMO_PAST_0009': new Date('2025-06-18'), // 12月 → 6月
      'DEMO_PAST_0005': new Date('2025-06-05'), // 12月 → 6月
      'DEMO_PAST_0008': new Date('2025-05-23'), // 11月 → 5月
      'DEMO_PAST_0002': new Date('2025-04-27'), // 10月 → 4月
      'DEMO_PAST_0006': new Date('2025-06-03'), // 8月 → 6月
    }

    for (const payment of futureDemoData) {
      const newDate = dateMapping[payment.paymentId]
      
      if (newDate) {
        console.log(`修正中: ${payment.paymentId}`)
        console.log(`  変更前: ${payment.createdAt.toLocaleDateString('ja-JP')}`)
        console.log(`  変更後: ${newDate.toLocaleDateString('ja-JP')}`)

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            createdAt: newDate,
            confirmedAt: payment.status === 'confirmed' ? newDate : payment.confirmedAt
          }
        })

        console.log(`  ✅ 修正完了\n`)
      } else {
        console.log(`⚠️  ${payment.paymentId} の修正日付が定義されていません`)
      }
    }

    console.log('🎯 デモデータの日付修正完了!')
    console.log('\n修正後の確認:')
    console.log('http://localhost:3000/transactions で「今月」を選択し、')
    console.log('7月のデータのみが表示されることを確認してください。')

  } catch (error) {
    console.error('修正エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDemoDataDates().catch(console.error)
