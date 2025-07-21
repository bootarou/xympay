import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// テスト用: 認証なしバージョン
export async function GET() {
  try {
    console.log('Accounting settings test endpoint called');
    
    // テスト用のダミーユーザーID（実際のデータベースに存在するユーザー）
    const testUserId = 'cmc8hf7zt0001b45cmpkqrs4b'; // テストスクリプトで使用されているユーザーID
    
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
      message: 'Test endpoint working',
      testUserId 
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// テスト用の設定作成
export async function POST(request: NextRequest) {
  try {
    console.log('Test POST endpoint called');
    
    const body = await request.json();
    const testUserId = 'cmc8hf7zt0001b45cmpkqrs4b';
    
    const newSettings = await prisma.accountingSyncSettings.create({
      data: {
        userId: testUserId,
        provider: body.provider || 'csv',
        isEnabled: true,
        autoSync: false,
        syncFrequency: 'daily',
        defaultTaxRate: 10.00,
        defaultAccountCode: '4110',
        exchangeRateSource: 'api',
        excludeStatuses: [],
      }
    });

    return NextResponse.json({ 
      settings: newSettings,
      message: 'Test creation successful'
    });

  } catch (error) {
    console.error('Error creating test settings:', error);
    return NextResponse.json(
      { 
        error: 'Creation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
