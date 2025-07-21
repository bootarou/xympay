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
    
    // パラメータ取得
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const format = searchParams.get('format') || 'csv';

    // 日付フィルター作成
    let dateFilter = {};
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      
      if (month) {
        const monthNum = parseInt(month);
        startDate.setMonth(monthNum - 1, 1);
        endDate.setMonth(monthNum - 1 + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }
      
      dateFilter = {
        confirmedAt: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    // 確認済み取引を取得
    const transactions = await prisma.payment.findMany({
      where: {
        userId,
        status: 'confirmed',
        ...dateFilter
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'asc'
      }
    });

    if (format === 'json') {
      return NextResponse.json({
        transactions: transactions.map(tx => ({
          paymentId: tx.paymentId,
          productName: tx.product.name,
          amount: tx.amount,
          amountXYM: Number(tx.amount) / 1000000,
          baseCurrencyAmount: tx.baseCurrencyAmount ? Number(tx.baseCurrencyAmount) : null,
          baseCurrency: tx.baseCurrency,
          exchangeRate: tx.exchangeRate ? Number(tx.exchangeRate) : null,
          rateProvider: tx.rateProvider,
          rateTimestamp: tx.rateTimestamp,
          confirmedAt: tx.confirmedAt,
          senderAddress: tx.senderAddress,
          transactionId: tx.transactionId
        })),
        summary: {
          totalTransactions: transactions.length,
          totalXYM: transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / 1000000,
          totalBaseCurrency: transactions
            .filter(tx => tx.baseCurrencyAmount)
            .reduce((sum, tx) => sum + Number(tx.baseCurrencyAmount), 0),
          currency: transactions.find(tx => tx.baseCurrency)?.baseCurrency || 'JPY'
        }
      });
    }

    // CSV形式でエクスポート
    const csvHeader = [
      '支払いID',
      '商品名',
      'XYM金額',
      '基準通貨金額',
      '基準通貨',
      '為替レート',
      'レートプロバイダー',
      'レート取得時刻',
      '取引確認日時',
      '送信者アドレス',
      'トランザクションID'
    ].join(',');

    const csvRows = transactions.map(tx => [
      tx.paymentId,
      `"${tx.product.name}"`,
      Number(tx.amount) / 1000000,
      tx.baseCurrencyAmount ? Number(tx.baseCurrencyAmount) : '',
      tx.baseCurrency || '',
      tx.exchangeRate ? Number(tx.exchangeRate) : '',
      tx.rateProvider || '',
      tx.rateTimestamp ? tx.rateTimestamp.toISOString() : '',
      tx.confirmedAt ? tx.confirmedAt.toISOString() : '',
      tx.senderAddress || '',
      tx.transactionId || ''
    ].join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // CSVとしてレスポンス
    const fileName = year && month 
      ? `xympay-transactions-${year}-${month.padStart(2, '0')}.csv`
      : year 
        ? `xympay-transactions-${year}.csv`
        : 'xympay-transactions-all.csv';

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
