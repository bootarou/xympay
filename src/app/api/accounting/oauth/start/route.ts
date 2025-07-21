import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { FreeeOAuthClient } from '../../../../../lib/oauth/freee';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const provider = searchParams.get('provider');

    if (!provider || !['freee'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // 環境変数の確認
    const clientId = process.env.FREEE_CLIENT_ID;
    const clientSecret = process.env.FREEE_CLIENT_SECRET;
    const redirectUri = process.env.FREEE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'OAuth credentials not configured' },
        { status: 500 }
      );
    }

    if (provider === 'freee') {
      const oauthClient = new FreeeOAuthClient({
        clientId,
        clientSecret,
        redirectUri,
        scopes: ['read', 'write'],
      });

      const state = await oauthClient.generateState(session.user.id);
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
