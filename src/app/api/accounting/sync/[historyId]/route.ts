import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { historyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { historyId } = params;

    // 同期履歴を取得（ユーザーの所有確認も含む）
    const syncHistory = await prisma.accountingSyncHistory.findFirst({
      where: {
        id: historyId,
        settings: {
          userId: session.user.id,
        }
      },
      include: {
        settings: {
          select: {
            provider: true,
            companyId: true,
          }
        }
      }
    });

    if (!syncHistory) {
      return NextResponse.json({ 
        error: '同期履歴が見つかりません' 
      }, { status: 404 });
    }

    // レスポンス用のデータを整形
    const response = {
      syncHistoryId: syncHistory.id,
      status: syncHistory.status,
      syncType: syncHistory.syncType,
      provider: syncHistory.settings.provider,
      companyId: syncHistory.settings.companyId,
      successCount: syncHistory.successCount,
      errorCount: syncHistory.failedCount,
      totalCount: syncHistory.totalRecords,
      startedAt: syncHistory.startedAt.toISOString(),
      completedAt: syncHistory.completedAt?.toISOString(),
      errorDetails: syncHistory.errors,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching sync progress:', error);
    return NextResponse.json(
      { 
        error: '同期進捗の取得に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
