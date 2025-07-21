import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const period = searchParams.get('period');

    // フィルタ条件の構築
    const where: { status?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    
    // ステータスフィルタ
    if (status && status !== 'all') {
      where.status = status;
    }

    // 期間フィルタ
    if (period && period !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (period) {
        case 'today':
          where.createdAt = {
            gte: today,
            lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
          };
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          where.createdAt = { gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          where.createdAt = { gte: monthAgo };
          break;
        case '3months':
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          where.createdAt = { gte: threeMonthsAgo };
          break;
      }
    }

    // 全ての取引を取得（CSVエクスポート用なので制限なし）
    const transactions = await prisma.payment.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // CSVヘッダー
    const headers = [
      '取引ID',
      '決済ID', 
      '商品名',
      '金額(XYM)',
      'ステータス',
      'ブロックチェーン取引ID',
      '送信者アドレス',
      'メッセージ',
      '作成日時',
      '確認日時',
      '期限日時'
    ];

    // ステータステキストの変換
    const getStatusText = (status: string): string => {
      switch (status) {
        case 'confirmed': return '完了';
        case 'pending': return '処理中';
        case 'expired': return '期限切れ';
        case 'cancelled': return 'キャンセル';
        default: return status;
      }
    };

    // 日時フォーマット
    const formatDateTime = (date: Date | null): string => {
      if (!date) return '';
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date(date));
    };

    // 金額フォーマット（μXYMからXYMに変換）
    const formatAmount = (amount: number | string): string => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      const xymAmount = numAmount / 1_000_000;
      return xymAmount.toFixed(6);
    };

    // CSVデータの作成
    const csvRows = [headers.join(',')];
    
    for (const transaction of transactions) {
      const row = [
        `"${transaction.id}"`,
        `"${transaction.paymentId}"`,
        `"${transaction.product.name}"`,
        formatAmount(parseFloat(transaction.amount.toString())),
        `"${getStatusText(transaction.status)}"`,
        `"${transaction.transactionId || ''}"`,
        `"${transaction.senderAddress || ''}"`,
        `"${transaction.message || ''}"`,
        `"${formatDateTime(transaction.createdAt)}"`,
        `"${formatDateTime(transaction.confirmedAt)}"`,
        `"${formatDateTime(transaction.expireAt)}"`
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    // UTF-8 BOMを追加（Excelで正しく表示するため）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // ファイル名（日付付き）
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `transactions_${dateStr}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
