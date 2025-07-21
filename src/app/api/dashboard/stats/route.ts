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
      productCount,
      monthlyStats,
      totalTransactions
    ] = await Promise.all([
      // 登録商品数
      prisma.product.count({
        where: { userId }
      }),
      
      // 今月の売上統計
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'confirmed',
          confirmedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // 今月1日から
            lte: new Date() // 現在まで
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),
      
      // 総取引数（全期間）
      prisma.payment.count({
        where: { 
          userId,
          status: 'confirmed'
        }
      })
    ]);

    // レスポンスデータの構築
    const stats = {
      productCount,
      monthlyRevenue: parseFloat(monthlyStats._sum.amount?.toString() || '0'),
      monthlyTransactions: monthlyStats._count.id,
      totalTransactions
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
