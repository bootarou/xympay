import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // daily, monthly, yearly
    const userId = session.user.id;

    let chartData;

    if (period === 'daily') {
      // 過去30日間の日別売上
      chartData = await getDailySales(userId);
    } else if (period === 'monthly') {
      // 過去12ヶ月の月別売上
      chartData = await getMonthlySales(userId);
    } else if (period === 'yearly') {
      // 過去5年間の年別売上
      chartData = await getYearlySales(userId);
    }

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getDailySales(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const salesData = await prisma.payment.groupBy({
    by: ['confirmedAt'],
    where: {
      userId,
      status: 'confirmed',
      confirmedAt: {
        gte: thirtyDaysAgo,
        lte: now
      }
    },
    _sum: {
      amount: true
    }
  });

  // 過去30日分のデータを準備
  const labels = [];
  const data = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
    
    // その日の売上を検索
    const dayTotal = salesData
      .filter(item => item.confirmedAt && item.confirmedAt.toISOString().split('T')[0] === dateStr)
      .reduce((sum, item) => sum + parseFloat(item._sum.amount?.toString() || '0'), 0);
    
    data.push(dayTotal / 1000000); // μXYMからXYMに変換
  }

  return {
    labels,
    datasets: [{
      label: '日別売上 (XYM)',
      data,
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.1
    }]
  };
}

async function getMonthlySales(userId: string) {
  const now = new Date();
  const labels = [];
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    
    labels.push(date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }));
    
    const monthlyTotal = await prisma.payment.aggregate({
      where: {
        userId,
        status: 'confirmed',
        confirmedAt: {
          gte: date,
          lte: nextDate
        }
      },
      _sum: {
        amount: true
      }
    });
    
    data.push(parseFloat(monthlyTotal._sum.amount?.toString() || '0') / 1000000); // μXYMからXYMに変換
  }

  return {
    labels,
    datasets: [{
      label: '月別売上 (XYM)',
      data,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1
    }]
  };
}

async function getYearlySales(userId: string) {
  const currentYear = new Date().getFullYear();
  const labels = [];
  const data = [];

  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    labels.push(`${year}年`);
    
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    
    const yearlyTotal = await prisma.payment.aggregate({
      where: {
        userId,
        status: 'confirmed',
        confirmedAt: {
          gte: yearStart,
          lte: yearEnd
        }
      },
      _sum: {
        amount: true
      }
    });
    
    data.push(parseFloat(yearlyTotal._sum.amount?.toString() || '0') / 1000000); // μXYMからXYMに変換
  }

  return {
    labels,
    datasets: [{
      label: '年別売上 (XYM)',
      data,
      borderColor: 'rgb(147, 51, 234)',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      tension: 0.1
    }]
  };
}
