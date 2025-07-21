import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // 期間に基づいて日付範囲を計算
    let startDate: Date | undefined
    const endDate = new Date()

    switch (period) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        // 今週（月曜日〜日曜日）
        const today = new Date()
        const dayOfWeek = today.getDay() // 0=日曜日, 1=月曜日, ..., 6=土曜日
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 月曜日からの日数
        
        startDate = new Date(today)
        startDate.setDate(today.getDate() - daysFromMonday)
        startDate.setHours(0, 0, 0, 0)
        
        const thisWeekEnd = new Date(startDate)
        thisWeekEnd.setDate(startDate.getDate() + 6)
        thisWeekEnd.setHours(23, 59, 59, 999)
        endDate.setTime(thisWeekEnd.getTime())
        break
      case 'month':
        // 今月の1日から今月末まで
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        const thisMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59, 999)
        endDate.setTime(thisMonthEnd.getTime())
        break
      case '3months':
        startDate = new Date()
        startDate.setDate(endDate.getDate() - 90)
        break
      case 'year':
        startDate = new Date()
        startDate.setDate(endDate.getDate() - 365)
        break
      case 'all':
      default:
        startDate = undefined
        break
    }

    // 現在期間の統計を取得
    const whereClause = {
      userId: session.user.id,
      status: 'confirmed',
      ...(startDate && { confirmedAt: { gte: startDate, lte: endDate } })
    }

    const [currentStats, currentBaseCurrency] = await Promise.all([
      prisma.payment.aggregate({
        where: whereClause,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          ...whereClause,
          baseCurrencyAmount: { not: null }
        },
        _sum: { baseCurrencyAmount: true }
      })
    ])

    // 比較用の前期間統計（成長率計算）
    let growthData = null
    if (startDate && period !== 'all') {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const prevStartDate = new Date(startDate)
      prevStartDate.setDate(startDate.getDate() - periodDays)
      const prevEndDate = new Date(startDate)

      const prevStats = await prisma.payment.aggregate({
        where: {
          userId: session.user.id,
          status: 'confirmed',
          confirmedAt: { gte: prevStartDate, lte: prevEndDate }
        },
        _sum: { amount: true },
        _count: true
      })

      const currentAmount = Number(currentStats._sum.amount || 0)
      const prevAmount = Number(prevStats._sum.amount || 0)
      const currentCount = currentStats._count
      const prevCount = prevStats._count

      growthData = {
        amount: currentAmount - prevAmount,
        count: currentCount - prevCount,
        percentage: prevAmount > 0 
          ? ((currentAmount - prevAmount) / prevAmount) * 100 
          : currentAmount > 0 ? 100 : 0
      }
    }

    // レスポンスデータを構築
    const responseData = {
      totalAmount: Number(currentStats._sum.amount || 0),
      transactionCount: currentStats._count,
      averageAmount: Number(currentStats._avg.amount || 0),
      baseCurrencyAmount: Number(currentBaseCurrency._sum.baseCurrencyAmount || 0),
      baseCurrency: 'JPY', // デフォルト
      growth: growthData,
      period: period,
      dateRange: startDate ? {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      } : null
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Transaction stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
