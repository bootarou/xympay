import { SignJWT, jwtVerify } from 'jose';

export interface FreeeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface FreeeCompany {
  id: number;
  name: string;
  name_kana: string;
  display_name: string;
  role: string;
}

export interface FreeeAccountItem {
  id: number;
  name: string;
  shortcut: string;
  tax_code: number;
  group_name: string;
  account_category: string;
  categories: string[];
}

export interface FreeeDeal {
  id: number;
  company_id: number;
  issue_date: string;
  due_date?: string;
  amount: number;
  due_amount: number;
  type: 'income' | 'expense';
  partner_id?: number;
  partner_code?: string;
  ref_number?: string;
  details: FreeeDealDetail[];
}

export interface FreeeDealDetail {
  id: number;
  account_item_id: number;
  tax_code: number;
  amount: number;
  vat: number;
  description: string;
}

export interface FreeeTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

export class FreeeOAuthClient {
  private config: FreeeOAuthConfig;
  private baseUrl: string;

  constructor(config: FreeeOAuthConfig, sandbox: boolean = false) {
    this.config = config;
    this.baseUrl = sandbox 
      ? 'https://accounts.secure.freee.co.jp' 
      : 'https://accounts.secure.freee.co.jp';
  }

  /**
   * OAuth認証URLを生成
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  async exchangeCodeForTokens(code: string): Promise<FreeeTokens> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }

  /**
   * リフレッシュトークンで新しいアクセストークンを取得
   */
  async refreshTokens(refreshToken: string): Promise<FreeeTokens> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // 新しいリフレッシュトークンがない場合は既存を保持
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }

  /**
   * アクセストークンの有効性をチェック
   */
  isTokenExpired(expiresAt: Date): boolean {
    // 5分のバッファを持たせる
    return new Date(Date.now() + 5 * 60 * 1000) >= expiresAt;
  }

  /**
   * 状態パラメータを生成・検証するためのJWTユーティリティ
   */
  async generateState(userId: string): Promise<string> {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    
    const jwt = await new SignJWT({ userId, timestamp: Date.now() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    return jwt;
  }

  async verifyState(state: string): Promise<{ userId: string } | null> {
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
      const { payload } = await jwtVerify(state, secret);
      
      return { userId: payload.userId as string };
    } catch (error) {
      console.error('State verification failed:', error);
      return null;
    }
  }
}

/**
 * freeeの会社情報を取得するAPIクライアント
 */
export class FreeeAPIClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string, sandbox: boolean = false) {
    this.accessToken = accessToken;
    this.baseUrl = sandbox 
      ? 'https://api.freee.co.jp' 
      : 'https://api.freee.co.jp';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`freee API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * 利用可能な事業所一覧を取得
   */
  async getCompanies(): Promise<FreeeCompany[]> {
    const data = await this.request('/api/1/companies') as { companies: FreeeCompany[] };
    return data.companies || [];
  }

  /**
   * 勘定科目一覧を取得
   */
  async getAccountItems(companyId: number): Promise<FreeeAccountItem[]> {
    const data = await this.request(`/api/1/account_items?company_id=${companyId}`) as { account_items: FreeeAccountItem[] };
    return data.account_items || [];
  }

  /**
   * 取引を作成
   */
  async createDeal(companyId: number, dealData: Partial<FreeeDeal>): Promise<FreeeDeal> {
    const data = await this.request(`/api/1/deals`, {
      method: 'POST',
      body: JSON.stringify({
        company_id: companyId,
        ...dealData,
      }),
    }) as { deal: FreeeDeal };
    
    return data.deal;
  }

  /**
   * 取引一覧を取得
   */
  async getDeals(companyId: number, params: Record<string, string | number> = {}): Promise<FreeeDeal[]> {
    const queryParams = new URLSearchParams({
      company_id: companyId.toString(),
      ...Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value.toString()])
      ),
    });
    
    const data = await this.request(`/api/1/deals?${queryParams.toString()}`) as { deals: FreeeDeal[] };
    return data.deals || [];
  }
}
