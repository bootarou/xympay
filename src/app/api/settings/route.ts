import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ユーザー設定を取得
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    });

    // 設定が存在しない場合はデフォルトを作成
    if (!userSettings) {
      const defaultSettings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          autoPaymentMonitoring: true,
          baseCurrency: 'JPY',
          currencySettings: {}
        }
      });

      return NextResponse.json({
        settings: {
          autoPaymentMonitoring: defaultSettings.autoPaymentMonitoring,
          notifications: true, // デフォルト値
          emailNotifications: true // デフォルト値
        }
      });
    }

    return NextResponse.json({
      settings: {
        autoPaymentMonitoring: userSettings.autoPaymentMonitoring,
        notifications: true, // 将来実装予定
        emailNotifications: true // 将来実装予定
      }
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { autoPaymentMonitoring, notifications, emailNotifications } = body;

    // 設定の検証
    const updateData: { autoPaymentMonitoring?: boolean } = {};

    if (typeof autoPaymentMonitoring === 'boolean') {
      updateData.autoPaymentMonitoring = autoPaymentMonitoring;
    }

    // notifications と emailNotifications は現在フロントエンドのみ
    // 将来的にデータベースに保存する場合はここに追加

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
        { status: 400 }
      );
    }

    // 設定を更新または作成
    const userSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        ...updateData,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        autoPaymentMonitoring: autoPaymentMonitoring ?? true,
        baseCurrency: 'JPY',
        currencySettings: {}
      }
    });

    return NextResponse.json({
      settings: {
        autoPaymentMonitoring: userSettings.autoPaymentMonitoring,
        notifications: notifications ?? true,
        emailNotifications: emailNotifications ?? true
      }
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
