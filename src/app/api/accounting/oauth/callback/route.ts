import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { FreeeOAuthClient } from '../../../../../lib/oauth/freee';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider') || 'freee';

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/accounting?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/accounting?error=missing_code_or_state', request.url)
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(
        new URL('/auth/signin', request.url)
      );
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
      return NextResponse.redirect(
        new URL('/accounting?error=user_not_found', request.url)
      );
    }

    const { freeeClientId, freeeClientSecret, freeeRedirectUri } = user;

    if (!freeeClientId || !freeeClientSecret || !freeeRedirectUri) {
      return NextResponse.redirect(
        new URL('/accounting?error=oauth_not_configured', request.url)
      );
    }

    const oauthClient = new FreeeOAuthClient({
      clientId: freeeClientId,
      clientSecret: freeeClientSecret,
      redirectUri: freeeRedirectUri,
      scopes: ['read', 'write'],
    });

    // stateの検証
    const stateData = await oauthClient.verifyState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL('/accounting?error=invalid_state', request.url)
      );
    }

    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/accounting?error=unauthorized', request.url)
      );
    }

    // 認証コードをトークンに交換
    const tokens = await oauthClient.exchangeCodeForTokens(code);

    // トークンを暗号化して保存
    const encryptedTokens = {
      accessToken: tokens.accessToken, // 実際には暗号化が必要
      refreshToken: tokens.refreshToken, // 実際には暗号化が必要
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    };

    // 既存の設定を更新、または新規作成
    await prisma.accountingSyncSettings.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: provider,
        },
      },
      update: {
        isEnabled: true,
        accessToken: encryptedTokens.accessToken,
        refreshToken: encryptedTokens.refreshToken,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        provider: provider,
        isEnabled: true,
        autoSync: false,
        syncFrequency: 'daily',
        defaultTaxRate: 10.00,
        defaultAccountCode: '4110',
        exchangeRateSource: 'api',
        accessToken: encryptedTokens.accessToken,
        refreshToken: encryptedTokens.refreshToken,
        excludeStatuses: [],
      },
    });

    // freee OAuth用の場合は専用ページにリダイレクト
    if (provider === 'freee') {
      return NextResponse.redirect(
        new URL('/accounting/freee-oauth?success=oauth_connected', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/accounting?success=oauth_connected', request.url)
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounting?error=oauth_failed', request.url)
    );
  }
}
