import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// 一時的に認証をスキップしたバージョン
export async function GET() {
  try {
    console.log('Temporary settings endpoint called (auth skipped)');
    
    // 一時的に固定のテストユーザーIDを使用
    const tempUserId = 'cmc8hf7zt0001b45cmpkqrs4b';
    
    const settings = await prisma.accountingSyncSettings.findMany({
      where: {
        userId: tempUserId
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

    return NextResponse.json({ 
      settings,
      temporary: true,
      message: 'Auth temporarily skipped for testing'
    });

  } catch (error) {
    console.error('Error in temporary settings endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        temporary: true
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Temporary settings creation called (auth skipped)');
    
    const tempUserId = 'cmc8hf7zt0001b45cmpkqrs4b';
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
        { error: 'Invalid provider', temporary: true },
        { status: 400 }
      );
    }

    // 既存設定の確認（同じプロバイダーは1つまで）
    const existingSetting = await prisma.accountingSyncSettings.findFirst({
      where: {
        userId: tempUserId,
        provider: provider,
      }
    });

    if (existingSetting) {
      return NextResponse.json(
        { error: 'Provider already exists', temporary: true },
        { status: 400 }
      );
    }

    const settings = await prisma.accountingSyncSettings.create({
      data: {
        userId: tempUserId,
        provider,
        isEnabled,
        autoSync,
        syncFrequency,
        defaultTaxRate,
        defaultAccountCode,
        exchangeRateSource,
        minAmount,
        excludeStatuses,
      }
    });

    return NextResponse.json({ 
      settings,
      temporary: true,
      message: 'Settings created successfully (auth skipped)'
    });

  } catch (error) {
    console.error('Error creating temporary settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        temporary: true
      },
      { status: 500 }
    );
  }
}
