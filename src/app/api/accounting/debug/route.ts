import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// デバッグ用: 認証スキップバージョン
export async function GET() {
  try {
    console.log('Debug settings endpoint called');
    
    // デバッグ用: 固定のテストユーザーIDを使用
    const testUserId = 'cmc8hf7zt0001b45cmpkqrs4b';
    
    const settings = await prisma.accountingSyncSettings.findMany({
      where: {
        userId: testUserId
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
      debug: true,
      userId: testUserId
    });

  } catch (error) {
    console.error('Error fetching accounting settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        debug: true
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Debug settings creation called');
    
    const testUserId = 'cmc8hf7zt0001b45cmpkqrs4b';
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
        { error: 'Invalid provider', debug: true },
        { status: 400 }
      );
    }

    const settings = await prisma.accountingSyncSettings.create({
      data: {
        userId: testUserId,
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
      debug: true,
      message: 'Settings created successfully'
    });

  } catch (error) {
    console.error('Error creating accounting settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        debug: true
      },
      { status: 500 }
    );
  }
}
