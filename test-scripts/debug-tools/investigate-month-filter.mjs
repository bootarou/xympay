#!/usr/bin/env node

/**
 * 今月フィルター問題の詳細調査スクリプト
 * - データベースの実際のデータを確認
 * - API期間フィルターの動作テスト
 * - 日付計算の検証
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 今月フィルター問題の詳細調査開始\n')

  try {
    // 現在の日付情報
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    console.log('=== 日付計算確認 ===')
    console.log('現在日時:', now.toLocaleString('ja-JP'))
    console.log('今月開始:', thisMonthStart.toLocaleString('ja-JP'))
    console.log('今月開始(UTC):', thisMonthStart.toISOString())
    console.log('')

    // 全決済データの確認
    console.log('=== データベース内の全決済データ ===')
    const allPayments = await prisma.payment.findMany({
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true,
        confirmedAt: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    allPayments.forEach(payment => {
      const createdDate = new Date(payment.createdAt)
      const isThisMonth = createdDate >= thisMonthStart
      console.log(`ID: ${payment.paymentId}`)
      console.log(`  作成日時: ${createdDate.toLocaleString('ja-JP')}`)
      console.log(`  今月?: ${isThisMonth ? '✅' : '❌'}`)
      console.log(`  ステータス: ${payment.status}`)
      console.log(`  商品: ${payment.product.name}`)
      console.log('')
    })

    // 今月フィルターでの取得テスト
    console.log('=== 今月フィルター適用テスト ===')
    const thisMonthPayments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: thisMonthStart
        }
      },
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`今月のデータ件数: ${thisMonthPayments.length}件`)
    thisMonthPayments.forEach(payment => {
      console.log(`  ${payment.paymentId}: ${new Date(payment.createdAt).toLocaleString('ja-JP')} (${payment.status})`)
    })

    // 他の月のデータ確認
    console.log('\n=== 他の月のデータ確認 ===')
    const otherMonthPayments = await prisma.payment.findMany({
      where: {
        createdAt: {
          lt: thisMonthStart
        }
      },
      select: {
        id: true,
        paymentId: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log(`他の月のデータ件数: ${otherMonthPayments.length}件`)
    otherMonthPayments.forEach(payment => {
      console.log(`  ${payment.paymentId}: ${new Date(payment.createdAt).toLocaleString('ja-JP')} (${payment.status})`)
    })

  } catch (error) {
    console.error('調査エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
