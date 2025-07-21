import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET: 特定の設定取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.accountingSyncSettings.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      select: {
        id: true,
        provider: true,
        isEnabled: true,
        autoSync: true,
        syncFrequency: true,
        lastSyncAt: true,
        defaultTaxRate: true,
        defaultAccountCode: true,
        exchangeRateSource: true,
        minAmount: true,
        excludeStatuses: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching accounting settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: 設定更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      isEnabled,
      autoSync,
      syncFrequency,
      defaultTaxRate,
      defaultAccountCode,
      exchangeRateSource,
      minAmount,
      excludeStatuses
    } = body;

    // 設定の存在確認
    const existingSettings = await prisma.accountingSyncSettings.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!existingSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    const updatedSettings = await prisma.accountingSyncSettings.update({
      where: {
        id: params.id
      },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(autoSync !== undefined && { autoSync }),
        ...(syncFrequency && { syncFrequency }),
        ...(defaultTaxRate !== undefined && { defaultTaxRate: parseFloat(defaultTaxRate) }),
        ...(defaultAccountCode && { defaultAccountCode }),
        ...(exchangeRateSource && { exchangeRateSource }),
        ...(minAmount !== undefined && { minAmount: minAmount ? parseFloat(minAmount) : null }),
        ...(excludeStatuses && { excludeStatuses }),
        updatedAt: new Date()
      }
    });

    // 認証情報を除いてレスポンス
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, refreshToken, ...safeSettings } = updatedSettings;

    return NextResponse.json({ settings: safeSettings });

  } catch (error) {
    console.error('Error updating accounting settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: 設定削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 設定の存在確認
    const existingSettings = await prisma.accountingSyncSettings.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!existingSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    // 関連データも削除（CASCADE削除）
    await prisma.accountingSyncSettings.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ message: 'Settings deleted successfully' });

  } catch (error) {
    console.error('Error deleting accounting settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
