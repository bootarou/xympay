import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// GET: 同期設定一覧取得
export async function GET() {
  try {
    console.log('Getting accounting settings...');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User ID:', session.user.id);
    
    const settings = await prisma.accountingSyncSettings.findMany({
      where: {
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
        // 認証情報は除外
      }
    });

    console.log('Found settings:', settings.length);
    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching accounting settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST: 新しい同期設定作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      provider,
      isEnabled = true,
      autoSync = false,
      syncFrequency = 'daily',
      defaultTaxRate = 10.00,
      defaultAccountCode = '4110',
      exchangeRateSource = 'api',
      minAmount,
      excludeStatuses = []
    } = body;

    // バリデーション
    if (!provider || !['freee', 'mf', 'yayoi', 'csv'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // 既存設定の確認（同じプロバイダーは1つまで）
    const existingSetting = await prisma.accountingSyncSettings.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider
        }
      }
    });

    if (existingSetting) {
      return NextResponse.json(
        { error: 'Settings for this provider already exist' },
        { status: 409 }
      );
    }

    const newSettings = await prisma.accountingSyncSettings.create({
      data: {
        userId: session.user.id,
        provider,
        isEnabled,
        autoSync,
        syncFrequency,
        defaultTaxRate,
        defaultAccountCode,
        exchangeRateSource,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        excludeStatuses
      }
    });

    // 認証情報を除いてレスポンス
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken: _, refreshToken: __, ...safeSettings } = newSettings;

    return NextResponse.json({ settings: safeSettings });

  } catch (error) {
    console.error('Error creating accounting settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
