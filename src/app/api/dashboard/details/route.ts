import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 並行してデータを取得
    const [
      totalSales,
      totalBaseCurrencySales,
      totalTransactions,
      pendingPayments,
      errorCount,
      recentTransactions
    ] = await Promise.all([
      // 総売上（全期間の確認済み取引）
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'confirmed'
        },
        _sum: {
          amount: true
        }
      }),
      
      // 総売上（基準通貨、全期間の確認済み取引）
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'confirmed',
          baseCurrencyAmount: { not: null }
        },
        _sum: {
          baseCurrencyAmount: true
        }
      }),
      
      // 総取引数（確認済み）
      prisma.payment.count({
        where: {
          userId,
          status: 'confirmed'
        }
      }),
      
      // 保留中の取引数
      prisma.payment.count({
        where: {
          userId,
          status: 'pending'
        }
      }),
      
      // エラーまたは期限切れの取引数
      prisma.payment.count({
        where: {
          userId,
          status: { in: ['expired', 'cancelled'] }
        }
      }),
      
      // 最近の取引（最新10件）
      prisma.payment.findMany({
        where: {
          userId,
          status: 'confirmed'
        },
        include: {
          product: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          confirmedAt: 'desc'
        },
        take: 10
      })
    ]);

    // レスポンスデータの構築
    const stats = {
      totalSales: parseFloat(totalSales._sum.amount?.toString() || '0'),
      totalBaseCurrencySales: parseFloat(totalBaseCurrencySales._sum.baseCurrencyAmount?.toString() || '0'),
      totalTransactions,
      pendingPayments,
      errorCount,
      recentTransactions: recentTransactions.map(transaction => ({
        id: transaction.id,
        paymentId: transaction.paymentId,
        productName: transaction.product.name,
        amount: parseFloat(transaction.amount.toString()),
        status: transaction.status,
        confirmedAt: transaction.confirmedAt,
        createdAt: transaction.createdAt,
        baseCurrencyAmount: transaction.baseCurrencyAmount ? parseFloat(transaction.baseCurrencyAmount.toString()) : null,
        baseCurrency: transaction.baseCurrency
      }))
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
