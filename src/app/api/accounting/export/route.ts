import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

interface ExportTransaction {
  transactionDate: string;
  paymentId: string;
  productName: string;
  amountXYM: number;
  amountJPY: number;
  exchangeRate: number;
  status: string;
  transactionId: string;
  senderAddress: string;
  taxRate: number;
  accountCode: string;
  memo: string;
}

// POST: 会計データのCSV/Excelエクスポート
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      format = 'csv', // 'csv' or 'excel'
      dateFrom,
      dateTo,
      status = 'confirmed',
      settingsId // 会計設定ID（税率・勘定科目の参照用）
    } = body;

    // 会計設定の取得
    let settings = null;
    if (settingsId) {
      settings = await prisma.accountingSyncSettings.findFirst({
        where: {
          id: settingsId,
          userId: session.user.id
        }
      });
    }

    // デフォルト設定
    const defaultTaxRate = settings?.defaultTaxRate || 10.00;
    const defaultAccountCode = settings?.defaultAccountCode || '4110';

    // 取引データの取得
    const whereClause: {
      userId: string;
      status?: string;
      confirmedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId: session.user.id
    };

    if (dateFrom || dateTo) {
      whereClause.confirmedAt = {};
      if (dateFrom) whereClause.confirmedAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.confirmedAt.lte = new Date(dateTo);
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    });

    console.log(`Exporting ${payments.length} transactions for user ${session.user.id}`);

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found for the specified criteria' },
        { status: 404 }
      );
    }

    // XYM/JPY換算（簡易的な固定レート、本来はAPI連携）
    const currentExchangeRate = 45.0; // 1 XYM = 45 JPY（実際はAPIから取得）

    // エクスポートデータの変換
    const exportData: ExportTransaction[] = payments.map(payment => {
      const amountXYM = parseFloat(payment.amount.toString()) / 1000000; // micro XYM to XYM
      const exchangeRate = payment.exchangeRate ? parseFloat(payment.exchangeRate.toString()) : currentExchangeRate;
      const amountJPY = amountXYM * exchangeRate;

      return {
        transactionDate: payment.confirmedAt?.toISOString().split('T')[0] || payment.createdAt.toISOString().split('T')[0],
        paymentId: payment.paymentId,
        productName: payment.product.name,
        amountXYM: parseFloat(amountXYM.toFixed(6)),
        amountJPY: parseFloat(amountJPY.toFixed(0)),
        exchangeRate: parseFloat(exchangeRate.toFixed(2)),
        status: payment.status,
        transactionId: payment.transactionId || '',
        senderAddress: payment.senderAddress || '',
        taxRate: parseFloat(defaultTaxRate.toString()),
        accountCode: defaultAccountCode,
        memo: `XymPay売上 - ${payment.product.name}`
      };
    });

    if (format === 'csv') {
      // CSVフォーマット
      const csvHeaders = [
        '取引日',
        '決済ID',
        '商品名',
        '金額(XYM)',
        '金額(JPY)',
        '換算レート',
        'ステータス',
        'トランザクションID',
        '送信者アドレス',
        '税率(%)',
        '勘定科目コード',
        '摘要'
      ];

      const csvRows = exportData.map(row => [
        row.transactionDate,
        row.paymentId,
        `"${row.productName}"`,
        row.amountXYM,
        row.amountJPY,
        row.exchangeRate,
        row.status,
        row.transactionId,
        row.senderAddress,
        row.taxRate,
        row.accountCode,
        `"${row.memo}"`
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="xympay-transactions-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });

    } else if (format === 'excel') {
      // 簡易的なExcel形式（TSV）
      const tsvHeaders = [
        '取引日',
        '決済ID', 
        '商品名',
        '金額(XYM)',
        '金額(JPY)',
        '換算レート',
        'ステータス',
        'トランザクションID',
        '送信者アドレス',
        '税率(%)',
        '勘定科目コード',
        '摘要'
      ];

      const tsvRows = exportData.map(row => [
        row.transactionDate,
        row.paymentId,
        row.productName,
        row.amountXYM,
        row.amountJPY,
        row.exchangeRate,
        row.status,
        row.transactionId,
        row.senderAddress,
        row.taxRate,
        row.accountCode,
        row.memo
      ]);

      const tsvContent = [tsvHeaders, ...tsvRows]
        .map(row => row.join('\t'))
        .join('\n');

      return new NextResponse(tsvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="xympay-transactions-${new Date().toISOString().split('T')[0]}.xls"`
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use "csv" or "excel"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error exporting accounting data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
