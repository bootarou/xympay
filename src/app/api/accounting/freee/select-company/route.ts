import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: '会社IDが必要です' }, { status: 400 });
    }

    // freee設定を更新
    const updatedSettings = await prisma.accountingSyncSettings.updateMany({
      where: {
        userId: session.user.id,
        provider: 'freee',
      },
      data: {
        companyId: companyId.toString(),
        updatedAt: new Date(),
      },
    });

    if (updatedSettings.count === 0) {
      return NextResponse.json({ error: 'freee設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: '会社が選択されました',
      companyId 
    });

  } catch (error) {
    console.error('Error selecting freee company:', error);
    return NextResponse.json(
      { 
        error: '会社選択に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
