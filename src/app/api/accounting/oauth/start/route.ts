import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { FreeeOAuthClient } from '../../../../../lib/oauth/freee';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const provider = searchParams.get('provider');

    if (!provider || !['freee'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // ユーザーのfreee設定を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        freeeClientId: true,
        freeeClientSecret: true,
        freeeRedirectUri: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { freeeClientId, freeeClientSecret, freeeRedirectUri } = user;

    if (!freeeClientId || !freeeClientSecret || !freeeRedirectUri) {
      return NextResponse.json(
        { 
          error: 'freee OAuth credentials not configured',
          message: 'freee連携設定が完了していません。設定ページで認証情報を登録してください。',
          redirectTo: '/settings/freee'
        },
        { status: 400 }
      );
    }

    if (provider === 'freee') {
      const oauthClient = new FreeeOAuthClient({
        clientId: freeeClientId,
        clientSecret: freeeClientSecret,
        redirectUri: freeeRedirectUri,
        scopes: ['read', 'write'],
      });

      const state = await oauthClient.generateState(user.id);
      const authUrl = oauthClient.generateAuthUrl(state);

      return NextResponse.json({ authUrl });
    }

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
