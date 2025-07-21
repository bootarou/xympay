import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface PaymentWithProduct {
  id: string;
  amount: Decimal;
  transactionId: string | null;
  senderAddress: string | null;
  message: string | null;
  status: string;
  createdAt: Date;
  userId: string;
  product: {
    name: string;
    price: Decimal;
  } | null;
}

interface SyncSettings {
  id: string;
  userId: string;
  provider: string;
  isEnabled: boolean;
  autoSync: boolean;
  syncFrequency: string;
  defaultTaxRate: Decimal; // Decimal型
  defaultAccountCode: string;
  exchangeRateSource: string;
  minAmount: Decimal | null; // Decimal型
  excludeStatuses: string[];
  accessToken: string | null;
  refreshToken: string | null;
  companyId: string | null;
}

// GET: 同期履歴一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const settingsId = searchParams.get('settingsId');

    const skip = (page - 1) * limit;

    const where: { userId: string; settingsId?: string } = {
      userId: session.user.id,
    };

    if (settingsId) {
      where.settingsId = settingsId;
    }

    const [histories, totalCount] = await Promise.all([
      prisma.accountingSyncHistory.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          settings: {
            select: {
              provider: true,
              autoSync: true,
            },
          },
        },
      }),
      prisma.accountingSyncHistory.count({ where }),
    ]);

    return NextResponse.json({
      histories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching sync histories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 手動同期実行
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settingsId, dateFrom, dateTo } = body;

    if (!settingsId) {
      return NextResponse.json({ error: 'Settings ID is required' }, { status: 400 });
    }

    // 設定の確認
    const settings = await prisma.accountingSyncSettings.findFirst({
      where: {
        id: settingsId,
        userId: session.user.id,
        isEnabled: true,
      },
    });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found or disabled' }, { status: 404 });
    }

    // 同期履歴を作成
    const syncHistory = await prisma.accountingSyncHistory.create({
      data: {
        userId: session.user.id,
        settingsId: settingsId,
        syncType: 'manual',
        status: 'running',
        startedAt: new Date(),
        dateFrom,
        dateTo,
      },
    });

    // バックグラウンドで同期処理を実行
    // 実際の実装では、ジョブキューやワーカープロセスを使用することを推奨
    processSyncJob(syncHistory.id, settings, { dateFrom, dateTo }).catch(error => {
      console.error('Sync job failed:', error);
    });

    return NextResponse.json({
      syncHistoryId: syncHistory.id,
      status: 'started',
      message: '同期処理を開始しました',
    });

  } catch (error) {
    console.error('Error starting sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// バックグラウンド同期処理（簡易版）
async function processSyncJob(
  syncHistoryId: string, 
  settings: SyncSettings, 
  params: { dateFrom?: string; dateTo?: string }
) {
  try {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 同期対象の取引を取得
    const payments = await prisma.payment.findMany({
      where: {
        userId: settings.userId,
        status: 'confirmed',
        ...(params.dateFrom && { createdAt: { gte: new Date(params.dateFrom) } }),
        ...(params.dateTo && { createdAt: { lte: new Date(params.dateTo) } }),
        // 既に同期済みでないもの
        syncedPayments: {
          none: {
            settingsId: settings.id,
          },
        },
      },
      include: {
        product: true,
      },
    });

    for (const payment of payments) {
      try {
        // 実際の会計ソフトAPI連携処理をここに実装
        await syncPaymentToAccountingSoftware(payment, settings);
        
        // 同期済みレコードを作成
        await prisma.syncedPayment.create({
          data: {
            paymentId: payment.id,
            settingsId: settings.id,
            externalId: `sync_${payment.id}_${Date.now()}`, // 実際の外部IDを使用
            syncedAt: new Date(),
          },
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 同期履歴を更新
    await prisma.accountingSyncHistory.update({
      where: { id: syncHistoryId },
      data: {
        status: errorCount > 0 ? 'partial' : 'success',
        completedAt: new Date(),
        successCount,
        failedCount: errorCount,
        errors: errors.length > 0 ? errors : null,
      },
    });

  } catch (error) {
    // 同期履歴をエラー状態で更新
    await prisma.accountingSyncHistory.update({
      where: { id: syncHistoryId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
    });
  }
}

// 会計ソフトへの同期処理（プロバイダーごとの実装）
async function syncPaymentToAccountingSoftware(payment: PaymentWithProduct, settings: SyncSettings) {
  if (settings.provider === 'freee') {
    // freee API連携処理
    await syncToFreee(payment);
  } else if (settings.provider === 'csv') {
    // CSV出力は即座に完了
    return;
  }
  // 他のプロバイダーの実装...
}

async function syncToFreee(payment: PaymentWithProduct) {
  // 実装例（簡略化）
  // 実際には、OAuth認証情報を使用してfreee APIを呼び出す
  console.log(`Syncing payment ${payment.id} to freee`);
  
  // ここでFreeeAPIClientを使用してデータを送信
  // const freeeClient = new FreeeAPIClient(accessToken);
  // await freeeClient.createDeal(companyId, dealData);
}
