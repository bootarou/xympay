import { 
  ExchangeRateProvider, 
  ExchangeRateResult, 
  ExchangeRateConfig, 
  ExchangeRateError,
  RateLimitError
} from './types';

/**
 * 為替レートプラグインマネージャー
 */
export class ExchangeRateManager {
  private providers: Map<string, ExchangeRateProvider> = new Map();
  private cache: Map<string, ExchangeRateResult> = new Map();
  private config: ExchangeRateConfig;
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config?: Partial<ExchangeRateConfig>) {
    this.config = {
      defaultProvider: 'coingecko',
      cacheDuration: 300, // 5分
      enabledProviders: ['coingecko', 'coinbase'],
      providerSettings: {},
      ...config
    };
    
    this.loadConfigFromStorage();
  }

  /**
   * プロバイダーを登録
   */
  registerProvider(provider: ExchangeRateProvider): void {
    this.providers.set(provider.id, provider);
    
    // 新しいプロバイダーを自動的に有効化
    if (!this.config.enabledProviders.includes(provider.id)) {
      this.config.enabledProviders.push(provider.id);
    }
    
    console.log(`📊 Exchange rate provider registered: ${provider.name} (${provider.id})`);
  }

  /**
   * 複数のプロバイダーを一括登録
   */
  registerProviders(providers: ExchangeRateProvider[]): void {
    providers.forEach(provider => this.registerProvider(provider));
  }

  /**
   * レート取得（キャッシュ・フォールバック付き）
   */
  async getRate(from: string, to: string, providerId?: string): Promise<ExchangeRateResult> {
    const cacheKey = `${from}-${to}-${providerId || this.config.defaultProvider}`;
    
    // キャッシュから取得を試行
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return cached;
    }

    // プロバイダーを決定
    const targetProviderId = providerId || this.config.defaultProvider;
    const provider = this.providers.get(targetProviderId);
    
    if (!provider) {
      throw new ExchangeRateError(
        `Provider ${targetProviderId} not found`,
        targetProviderId,
        from,
        to
      );
    }

    // レート制限チェック
    if (this.isRateLimited(provider.id)) {
      throw new RateLimitError(provider.id);
    }

    try {
      // レート取得
      const result = await provider.getRate(from, to);
      
      // キャッシュに保存
      this.setCachedRate(cacheKey, result);
      
      // レート制限カウンターを更新
      this.updateRateLimit(provider.id);
      
      return result;
      
    } catch (error) {
      console.error(`Failed to get rate from ${provider.id}:`, error);
      
      // フォールバックプロバイダーを試行
      if (this.config.fallbackProvider && this.config.fallbackProvider !== targetProviderId) {
        console.log(`Trying fallback provider: ${this.config.fallbackProvider}`);
        return this.getRate(from, to, this.config.fallbackProvider);
      }
      
      throw error;
    }
  }

  /**
   * 複数プロバイダーからの平均レート取得
   */
  async getAverageRate(from: string, to: string, providerIds?: string[]): Promise<ExchangeRateResult> {
    const providers = providerIds || this.config.enabledProviders;
    const results: ExchangeRateResult[] = [];
    
    // 各プロバイダーからレートを取得
    for (const providerId of providers) {
      try {
        const result = await this.getRate(from, to, providerId);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to get rate from ${providerId}:`, error);
      }
    }
    
    if (results.length === 0) {
      throw new ExchangeRateError(
        'No providers available for rate calculation',
        'average',
        from,
        to
      );
    }
    
    // 平均レートを計算
    const averageRate = results.reduce((sum, result) => sum + result.rate, 0) / results.length;
    
    return {
      from,
      to,
      rate: averageRate,
      timestamp: new Date(),
      provider: 'average',
      metadata: {
        sources: results.map(r => ({ provider: r.provider, rate: r.rate })),
        count: results.length
      }
    };
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  getAvailableProviders(): Array<{ providerId: string; provider: ExchangeRateProvider }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      providerId: id,
      provider
    }));
  }

  /**
   * 有効なプロバイダー一覧を取得
   */
  getEnabledProviders(): Array<{ providerId: string; provider: ExchangeRateProvider }> {
    return this.getAvailableProviders().filter(({ providerId }) => 
      this.config.enabledProviders.includes(providerId)
    );
  }

  /**
   * プロバイダーの健全性チェック
   */
  async healthCheck(providerId?: string): Promise<Record<string, boolean>> {
    const providersToCheck = providerId 
      ? [providerId] 
      : this.config.enabledProviders;
    
    const results: Record<string, boolean> = {};
    
    for (const id of providersToCheck) {
      const provider = this.providers.get(id);
      if (provider) {
        try {
          results[id] = await provider.healthCheck();
        } catch {
          results[id] = false;
        }
      } else {
        results[id] = false;
      }
    }
    
    return results;
  }

  /**
   * 設定を取得
   */
  getConfig(): ExchangeRateConfig {
    return { ...this.config };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ExchangeRateConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfigToStorage();
  }

  /**
   * プロバイダーの有効/無効を設定
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    if (enabled) {
      if (!this.config.enabledProviders.includes(providerId)) {
        this.config.enabledProviders.push(providerId);
      }
    } else {
      this.config.enabledProviders = this.config.enabledProviders.filter(id => id !== providerId);
    }
    this.saveConfigToStorage();
  }

  /**
   * キャッシュからレート取得
   */
  private getCachedRate(cacheKey: string): ExchangeRateResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    const cacheAge = now - cached.timestamp.getTime();
    
    if (cacheAge > this.config.cacheDuration * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  /**
   * キャッシュにレート保存
   */
  private setCachedRate(cacheKey: string, result: ExchangeRateResult): void {
    this.cache.set(cacheKey, result);
  }

  /**
   * レート制限チェック
   */
  private isRateLimited(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;
    
    const limit = this.rateLimits.get(providerId);
    if (!limit) return false;
    
    const now = Date.now();
    
    // リセット時間を過ぎている場合はリセット
    if (now > limit.resetTime) {
      this.rateLimits.delete(providerId);
      return false;
    }
    
    return limit.count >= provider.rateLimit.requests;
  }

  /**
   * レート制限カウンターを更新
   */
  private updateRateLimit(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;
    
    const now = Date.now();
    const limit = this.rateLimits.get(providerId);
    
    if (!limit) {
      this.rateLimits.set(providerId, {
        count: 1,
        resetTime: now + (provider.rateLimit.window * 1000)
      });
    } else {
      limit.count++;
    }
  }

  /**
   * 設定をローカルストレージに保存
   */
  private saveConfigToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xympay_exchange_rate_config', JSON.stringify(this.config));
    }
  }

  /**
   * 設定をローカルストレージから読み込み
   */
  private loadConfigFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xympay_exchange_rate_config');
      if (stored) {
        try {
          const config = JSON.parse(stored);
          this.config = { ...this.config, ...config };
        } catch (error) {
          console.warn('Failed to load exchange rate config from storage:', error);
        }
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * デバッグ情報を表示
   */
  debugInfo(): void {
    console.log('=== Exchange Rate Manager Debug ===');
    console.log('Enabled providers:', this.config.enabledProviders);
    console.log('Default provider:', this.config.defaultProvider);
    console.log('Cache size:', this.cache.size);
    console.log('Rate limits:', Array.from(this.rateLimits.entries()));
    console.log('All registered providers:', Array.from(this.providers.keys()));
    console.log('Config:', this.config);
    console.log('====================================');
  }
}

// デフォルトインスタンス
export const exchangeRateManager = new ExchangeRateManager();
