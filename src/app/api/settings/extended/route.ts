import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    // 開発用：最初のユーザーの設定を取得
    const user = await prisma.user.findFirst();

    if (!user) {
      // デフォルト設定を返す
      const defaultExtendedSettings = {
        autoPaymentMonitoring: true,
        notifications: true,
        emailNotifications: true,
        baseCurrency: 'JPY',
        currencySettings: {
          baseCurrency: 'JPY',
          displayDecimals: 2,
          rateProvider: 'coingecko',
          autoUpdateRate: true,
          fallbackRateProvider: 'coingecko',
          updateInterval: 300
        }
      };
      return NextResponse.json({ settings: defaultExtendedSettings });
    }

    // UserSettingsを直接検索
    const userSettings = await prisma.$queryRaw`
      SELECT * FROM "UserSettings" WHERE "userId" = ${user.id} LIMIT 1
    `;

    if (!userSettings || (Array.isArray(userSettings) && userSettings.length === 0)) {
      // デフォルト設定を作成
      await prisma.$executeRaw`
        INSERT INTO "UserSettings" ("id", "userId", "autoPaymentMonitoring", "baseCurrency", "currencySettings", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${user.id}, true, 'JPY', '{"baseCurrency":"JPY","displayDecimals":2,"rateProvider":"coingecko","autoUpdateRate":true,"fallbackRateProvider":"coingecko","updateInterval":300}'::jsonb, NOW(), NOW())
      `;
      
      const extendedSettings = {
        autoPaymentMonitoring: true,
        notifications: true,
        emailNotifications: true,
        baseCurrency: 'JPY',
        currencySettings: {
          baseCurrency: 'JPY',
          displayDecimals: 2,
          rateProvider: 'coingecko',
          autoUpdateRate: true,
          fallbackRateProvider: 'coingecko',
          updateInterval: 300
        }
      };
      
      console.log('📊 Created default settings:', extendedSettings);
      return NextResponse.json({ settings: extendedSettings });
    }

    // 既存設定を返す
    const settings = Array.isArray(userSettings) ? userSettings[0] : userSettings;
    const currencySettings = typeof settings.currencySettings === 'string' 
      ? JSON.parse(settings.currencySettings) 
      : settings.currencySettings;

    const extendedSettings = {
      autoPaymentMonitoring: settings.autoPaymentMonitoring,
      notifications: true,
      emailNotifications: true,
      baseCurrency: settings.baseCurrency,
      currencySettings: currencySettings
    };

    console.log('📊 Settings loaded:', extendedSettings);
    return NextResponse.json({ settings: extendedSettings });

  } catch (error) {
    console.error('Error fetching extended user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      autoPaymentMonitoring, 
      notifications, 
      emailNotifications,
      baseCurrency,
      currencySettings 
    } = body;

    console.log('📊 Received settings update:', body);

    // バリデーション
    if (baseCurrency !== undefined && typeof baseCurrency !== 'string') {
      return NextResponse.json(
        { error: 'Invalid baseCurrency value' },
        { status: 400 }
      );
    }

    if (currencySettings !== undefined && typeof currencySettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid currencySettings value' },
        { status: 400 }
      );
    }

    // 開発用：最初のユーザーの設定を更新
    const user = await prisma.user.findFirst();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No user found' },
        { status: 404 }
      );
    }

    // 設定を更新または作成
    await prisma.$executeRaw`
      INSERT INTO "UserSettings" ("id", "userId", "autoPaymentMonitoring", "baseCurrency", "currencySettings", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${user.id}, ${autoPaymentMonitoring ?? true}, ${baseCurrency ?? 'JPY'}, ${JSON.stringify(currencySettings ?? {})}::jsonb, NOW(), NOW())
      ON CONFLICT ("userId") 
      DO UPDATE SET 
        "autoPaymentMonitoring" = ${autoPaymentMonitoring ?? true},
        "baseCurrency" = ${baseCurrency ?? 'JPY'},
        "currencySettings" = ${JSON.stringify(currencySettings ?? {})}::jsonb,
        "updatedAt" = NOW()
    `;

    console.log('💾 Settings saved to database');

    // 保存された設定を返す
    const savedSettings = {
      autoPaymentMonitoring: autoPaymentMonitoring ?? true,
      notifications: notifications ?? true,
      emailNotifications: emailNotifications ?? true,
      baseCurrency: baseCurrency ?? 'JPY',
      currencySettings: currencySettings ?? {}
    };

    return NextResponse.json({ settings: savedSettings });

  } catch (error) {
    console.error('Error updating extended user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
