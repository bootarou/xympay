import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { FreeeAPIClient } from '../../../../../lib/oauth/freee';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // freee設定を取得
    const freeeSettings = await prisma.accountingSyncSettings.findFirst({
      where: {
        userId: session.user.id,
        provider: 'freee',
        isEnabled: true,
      }
    });

    if (!freeeSettings || !freeeSettings.accessToken) {
      return NextResponse.json({ error: 'freee OAuth認証が必要です' }, { status: 400 });
    }

    // トークン情報
    const accessToken = freeeSettings.accessToken;
    
    // freee APIクライアントで会社一覧を取得
    const freeeClient = new FreeeAPIClient(accessToken);
    const companies = await freeeClient.getCompanies();

    return NextResponse.json({ companies });

  } catch (error) {
    console.error('Error fetching freee companies:', error);
    return NextResponse.json(
      { 
        error: 'freee会社一覧の取得に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
