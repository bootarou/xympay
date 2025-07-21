import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status');
    const period = searchParams.get('period');

    console.log('Transactions API called with:', { page, limit, status, period })

    // ページネーション用の計算
    const skip = (page - 1) * limit;

    // フィルタ条件の構築
    const where: { status?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    
    // ステータスフィルタ
    if (status && status !== 'all') {
      where.status = status;
    }

    // 期間フィルタ
    if (period && period !== 'all' && period !== '') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log('Applying period filter:', period)
      
      switch (period) {
        case 'today':
          // 今日のみ（00:00:00 〜 23:59:59）
          const todayStart = today;
          const todayEndTime = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
          where.createdAt = {
            gte: todayStart,
            lte: todayEndTime
          };
          console.log('Today filter applied - start:', todayStart.toISOString(), 'end:', todayEndTime.toISOString())
          break;
        case 'week':
          // 今週（月曜日〜日曜日）
          const dayOfWeek = today.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日からの日数
          
          const thisWeekStart = new Date(today);
          thisWeekStart.setDate(today.getDate() - daysFromMonday);
          thisWeekStart.setHours(0, 0, 0, 0);
          
          const thisWeekEnd = new Date(thisWeekStart);
          thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
          thisWeekEnd.setHours(23, 59, 59, 999);
          
          where.createdAt = { 
            gte: thisWeekStart,
            lte: thisWeekEnd
          };
          console.log('Week filter applied - start:', thisWeekStart.toISOString(), 'end:', thisWeekEnd.toISOString())
          break;
        case 'month':
          // 今月の1日から今月末まで
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          where.createdAt = { 
            gte: thisMonthStart,
            lte: thisMonthEnd
          };
          console.log('Month filter applied - start:', thisMonthStart.toISOString(), 'end:', thisMonthEnd.toISOString())
          break;
        case '3months':
          // 過去3ヶ月間（今日まで）
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          const threeMonthsEndTime = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
          where.createdAt = { 
            gte: threeMonthsAgo,
            lte: threeMonthsEndTime
          };
          console.log('3Months filter applied - start:', threeMonthsAgo.toISOString(), 'end:', threeMonthsEndTime.toISOString())
          break;
      }
      
      console.log('Final where clause:', JSON.stringify(where, null, 2))
    } else {
      console.log('No period filter applied - showing all data')
    }

    // 取引履歴の取得（ページネーション付き）
    const [transactions, totalCount, stats] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        select: {
          id: true,
          paymentId: true,
          status: true,
          amount: true,
          transactionId: true,
          senderAddress: true,
          message: true,
          confirmedAt: true,
          createdAt: true,
          expireAt: true,
          userId: true,
          product: {
            select: {
              name: true,
              price: true
            }
          }
        }
      }),
      prisma.payment.count({ where }),
      // 統計情報を取得（確認済み取引のみ）
      prisma.payment.aggregate({
        where: { 
          ...where, 
          status: 'confirmed' 
        },
        _sum: {
          amount: true,
        },
        _avg: {
          amount: true,
        },
        _count: {
          id: true,
        }
      })
    ]);

    // レスポンスの構築（Decimalフィールドを数値に変換）
    const processedTransactions = transactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      product: {
        ...transaction.product,
        price: parseFloat(transaction.product.price.toString())
      }
    }))

    const response = {
      transactions: processedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      stats: {
        totalAmount: parseFloat(stats._sum.amount?.toString() || '0'),
        averageAmount: parseFloat(stats._avg.amount?.toString() || '0'),
        confirmedTransactionCount: stats._count.id,
        totalTransactionCount: totalCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}