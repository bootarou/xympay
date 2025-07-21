import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { FreeeAPIClient } from '../../../../../lib/oauth/freee';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIds, settingsId } = await request.json();

    if (!settingsId || !paymentIds || !Array.isArray(paymentIds)) {
      return NextResponse.json({ 
        error: '設定IDと支払いIDリストが必要です' 
      }, { status: 400 });
    }

    // freee設定を取得
    const settings = await prisma.accountingSyncSettings.findFirst({
      where: {
        id: settingsId,
        userId: session.user.id,
        provider: 'freee',
        isEnabled: true,
      }
    });

    if (!settings || !settings.accessToken || !settings.companyId) {
      return NextResponse.json({ 
        error: 'freee設定が見つからないか、OAuth認証または会社選択が完了していません' 
      }, { status: 400 });
    }

    // アクセストークン
    const accessToken = settings.accessToken;
    
    // 指定された支払いデータを取得
    const payments = await prisma.payment.findMany({
      where: {
        id: { in: paymentIds },
        userId: session.user.id,
        status: 'confirmed',
      },
      include: {
        user: true,
      }
    });

    if (payments.length === 0) {
      return NextResponse.json({ 
        error: '有効な支払いデータが見つかりません' 
      }, { status: 404 });
    }

    // freee APIクライアントを初期化
    const freeeClient = new FreeeAPIClient(accessToken);
    const companyId = parseInt(settings.companyId);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // 同期履歴エントリを作成
    const syncHistory = await prisma.accountingSyncHistory.create({
      data: {
        settingsId: settings.id,
        userId: session.user.id,
        syncType: 'manual',
        status: 'running',
        startedAt: new Date(),
        totalRecords: payments.length,
        successCount: 0,
        failedCount: 0,
      }
    });

    try {
      // 各支払いデータをfreeeに同期
      for (const payment of payments) {
        try {
          // freee取引データを作成
          const amount = parseFloat(payment.amount.toString());
          const dealData = {
            issue_date: payment.createdAt.toISOString().split('T')[0], // YYYY-MM-DD形式
            type: 'income' as const,
            amount: Math.round(amount * 100), // 円に変換（XYMは小数点以下があるため）
            due_amount: Math.round(amount * 100),
            ref_number: payment.id,
            details: [
              {
                id: 0, // 新規作成時は0
                account_item_id: parseInt(settings.defaultAccountCode),
                tax_code: 1, // 標準税率
                amount: Math.round(amount * 100),
                vat: Math.round(amount * 100 * (parseFloat(settings.defaultTaxRate.toString()) / 100)),
                description: `XymPay決済 - オンライン決済`,
              }
            ]
          };

          // freee APIに送信
          const createdDeal = await freeeClient.createDeal(companyId, dealData);

          // 同期済みペイメントレコードを作成
          await prisma.syncedPayment.create({
            data: {
              paymentId: payment.id,
              settingsId: settings.id,
              externalId: createdDeal.id.toString(),
              syncData: JSON.parse(JSON.stringify(createdDeal)),
              syncedAt: new Date(),
            }
          });

          successCount++;
          results.push({
            paymentId: payment.id,
            status: 'success',
            externalId: createdDeal.id,
            message: 'freeeに正常に同期されました'
          });

        } catch (error) {
          errorCount++;
          results.push({
            paymentId: payment.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'freeeへの同期に失敗しました'
          });
        }
      }

      // 同期履歴を更新
      await prisma.accountingSyncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: errorCount === 0 ? 'success' : 'partial',
          completedAt: new Date(),
          successCount,
          failedCount: errorCount,
          errors: errorCount > 0 ? results.filter(r => r.status === 'error') : null,
        }
      });

      // 設定の最終同期日時を更新
      await prisma.accountingSyncSettings.update({
        where: { id: settings.id },
        data: { lastSyncAt: new Date() }
      });

      return NextResponse.json({
        success: true,
        syncHistoryId: syncHistory.id,
        successCount,
        errorCount,
        totalCount: payments.length,
        results,
        message: `${successCount}件の支払いが正常に同期されました${errorCount > 0 ? `（${errorCount}件エラー）` : ''}`
      });

    } catch (error) {
      // 同期履歴をエラー状態に更新
      await prisma.accountingSyncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          failedCount: payments.length,
          errors: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      });

      throw error;
    }

  } catch (error) {
    console.error('Error syncing to freee:', error);
    return NextResponse.json(
      { 
        error: 'freeeへの同期に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
