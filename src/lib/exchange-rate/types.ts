// 為替レート取得システム - 型定義
export interface ExchangeRateProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedCurrencies: string[];
  readonly rateLimit: {
    requests: number;
    window: number; // seconds
  };
  
  // レート取得
  getRate(from: string, to: string): Promise<ExchangeRateResult>;
  
  // 複数レート取得
  getRates(from: string, to: string[]): Promise<ExchangeRateResult[]>;
  
  // プロバイダーの健全性チェック
  healthCheck(): Promise<boolean>;
  
  // 設定画面（オプション）
  getConfigComponent?(): React.ComponentType<ExchangeRateProviderConfigProps>;
}

export interface ExchangeRateResult {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface ExchangeRateProviderConfigProps {
  settings: Record<string, unknown>;
  onSettingsChange: (settings: Record<string, unknown>) => void;
}

export interface ExchangeRateConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  cacheDuration: number; // seconds
  enabledProviders: string[];
  providerSettings: Record<string, Record<string, unknown>>;
}

export interface CurrencySettings {
  baseCurrency: string;
  displayDecimals: number;
  rateProvider: string;
  autoUpdateRate: boolean;
  fallbackRateProvider?: string;
  updateInterval: number; // seconds
}

// 共通の通貨コード
export const SUPPORTED_CURRENCIES = [
  'JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// エラー型
export class ExchangeRateError extends Error {
  constructor(
    message: string,
    public provider: string,
    public from: string,
    public to: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ExchangeRateError';
  }
}

export class RateLimitError extends ExchangeRateError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for provider ${provider}`,
      provider,
      '',
      ''
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  
  retryAfter?: number;
}

export class ProviderUnavailableError extends ExchangeRateError {
  constructor(provider: string, from: string, to: string) {
    super(
      `Provider ${provider} is currently unavailable`,
      provider,
      from,
      to
    );
    this.name = 'ProviderUnavailableError';
  }
}
