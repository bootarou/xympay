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

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // 年度の開始と終了
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 月別統計を取得
    const monthlyStats = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const month = i + 1;
        const monthStart = new Date(parseInt(year), i, 1);
        const monthEnd = new Date(parseInt(year), i + 1, 0, 23, 59, 59, 999);

        const result = await prisma.payment.aggregate({
          where: {
            userId,
            status: 'confirmed',
            confirmedAt: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          _sum: {
            amount: true,
            baseCurrencyAmount: true
          },
          _count: {
            id: true
          }
        });

        return {
          month,
          monthName: new Date(parseInt(year), i).toLocaleDateString('ja-JP', { month: 'long' }),
          transactionCount: result._count.id,
          totalXYM: result._sum.amount ? Number(result._sum.amount) / 1000000 : 0,
          totalBaseCurrency: result._sum.baseCurrencyAmount ? Number(result._sum.baseCurrencyAmount) : 0
        };
      })
    );

    // 年間合計
    const yearlyTotal = await prisma.payment.aggregate({
      where: {
        userId,
        status: 'confirmed',
        confirmedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true,
        baseCurrencyAmount: true
      },
      _count: {
        id: true
      }
    });

    // カテゴリ別統計（商品名で代用）
    const categoryStats = await prisma.payment.findMany({
      where: {
        userId,
        status: 'confirmed',
        confirmedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        amount: true,
        baseCurrencyAmount: true,
        product: {
          select: {
            name: true
          }
        }
      }
    });

    // 商品別集計
    const productGroups = categoryStats.reduce((acc, payment) => {
      const productName = payment.product.name;
      if (!acc[productName]) {
        acc[productName] = {
          productName,
          count: 0,
          totalAmount: 0,
          totalBaseCurrency: 0
        };
      }
      acc[productName].count++;
      acc[productName].totalAmount += Number(payment.amount) / 1000000;
      acc[productName].totalBaseCurrency += payment.baseCurrencyAmount ? Number(payment.baseCurrencyAmount) : 0;
      return acc;
    }, {} as Record<string, {
      productName: string;
      count: number;
      totalAmount: number;
      totalBaseCurrency: number;
    }>);

    return NextResponse.json({
      year: parseInt(year),
      summary: {
        totalTransactions: yearlyTotal._count.id,
        totalXYM: yearlyTotal._sum.amount ? Number(yearlyTotal._sum.amount) / 1000000 : 0,
        totalBaseCurrency: yearlyTotal._sum.baseCurrencyAmount ? Number(yearlyTotal._sum.baseCurrencyAmount) : 0,
        baseCurrency: 'JPY'
      },
      monthlyStats,
      productStats: Object.values(productGroups)
    });

  } catch (error) {
    console.error('Error generating tax summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
