# 通貨単位選択・レート取得APIプラグイン化 設計書

## 📋 概要

課税売上対応のため、以下の機能を実装します：

1. **システム設定での通貨単位選択** (JPY, USD, EUR等)
2. **レート取得APIのプラグイン化** (複数の取引所API対応)
3. **決済時のレート保存** (Paymentテーブル拡張)
4. **課税売上集計UI** (管理画面)

## 🗄️ データベース設計

### 1. UserSettingsテーブル拡張

```sql
-- 既存のUserSettingsテーブルに通貨設定を追加
ALTER TABLE "UserSettings" ADD COLUMN "baseCurrency" VARCHAR(3) DEFAULT 'JPY';
ALTER TABLE "UserSettings" ADD COLUMN "currencySettings" JSONB DEFAULT '{}';

-- currencySettingsの構造例
{
  "displayDecimals": 2,
  "rateProvider": "coinbase",
  "autoUpdateRate": true,
  "fallbackRateProvider": "coingecko"
}
```

### 2. Paymentテーブル拡張

```sql
-- 決済時のレート情報を保存
ALTER TABLE "Payment" ADD COLUMN "exchangeRate" DECIMAL(20, 8);
ALTER TABLE "Payment" ADD COLUMN "baseCurrency" VARCHAR(3) DEFAULT 'JPY';
ALTER TABLE "Payment" ADD COLUMN "baseCurrencyAmount" DECIMAL(20, 8);
ALTER TABLE "Payment" ADD COLUMN "rateProvider" VARCHAR(50);
ALTER TABLE "Payment" ADD COLUMN "rateTimestamp" TIMESTAMP;

-- インデックス追加
CREATE INDEX "idx_payment_rate_timestamp" ON "Payment"("rateTimestamp");
CREATE INDEX "idx_payment_base_currency" ON "Payment"("baseCurrency");
```

### 3. 新規テーブル：SystemExchangeRates

```sql
-- レートキャッシュ用テーブル
CREATE TABLE "SystemExchangeRates" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "baseCurrency" VARCHAR(3) NOT NULL,
  "targetCurrency" VARCHAR(3) NOT NULL DEFAULT 'XYM',
  "rate" DECIMAL(20, 8) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  "isActive" BOOLEAN DEFAULT TRUE,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 複合インデックス
CREATE UNIQUE INDEX "idx_system_rates_currency_provider" 
ON "SystemExchangeRates"("baseCurrency", "targetCurrency", "provider");
```

## 🔌 プラグインシステム設計

### 1. レート取得プラグインインターフェース

```typescript
// src/lib/exchange-rate/types.ts
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
  getConfigComponent?(): React.ComponentType<any>;
}

export interface ExchangeRateResult {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  provider: string;
  metadata?: Record<string, any>;
}
```

### 2. プラグインマネージャー

```typescript
// src/lib/exchange-rate/manager.ts
export class ExchangeRateManager {
  private providers: Map<string, ExchangeRateProvider> = new Map();
  private cache: Map<string, ExchangeRateResult> = new Map();
  private config: ExchangeRateConfig;
  
  // プロバイダー登録
  registerProvider(provider: ExchangeRateProvider): void;
  
  // レート取得（キャッシュ・フォールバック付き）
  async getRate(from: string, to: string, providerId?: string): Promise<ExchangeRateResult>;
  
  // 複数プロバイダーからの平均レート取得
  async getAverageRate(from: string, to: string): Promise<ExchangeRateResult>;
  
  // 設定管理
  updateConfig(config: Partial<ExchangeRateConfig>): void;
  getConfig(): ExchangeRateConfig;
}
```

## 📱 フロントエンド設計

### 1. 通貨設定UI

```typescript
// src/components/CurrencySettings.tsx
// - 基準通貨選択 (JPY, USD, EUR等)
// - レートプロバイダー選択
// - 表示桁数設定
// - 自動更新設定
```

### 2. 課税売上ダッシュボード

```typescript
// src/app/dashboard/tax-sales/page.tsx
// - 月別売上（基準通貨）
// - 税率計算
// - エクスポート機能
// - レート履歴表示
```

## 🌐 API設計

### 1. 通貨設定API

```typescript
// GET /api/settings/currency
// PUT /api/settings/currency
// GET /api/exchange-rates/providers
// GET /api/exchange-rates/current
```

### 2. レート取得API

```typescript
// GET /api/exchange-rates/[from]/[to]
// POST /api/exchange-rates/refresh
// GET /api/exchange-rates/history
```

## 🔧 実装の段階

### Phase 1: 基礎設定
- [ ] データベーススキーマ更新
- [ ] 基本的な通貨設定UI
- [ ] 設定API拡張

### Phase 2: プラグインシステム
- [ ] ExchangeRateProviderインターフェース
- [ ] プラグインマネージャー
- [ ] 基本プロバイダー実装

### Phase 3: 決済連携
- [ ] 決済時レート保存
- [ ] 既存データ移行
- [ ] 課税売上集計

### Phase 4: 管理機能
- [ ] 課税売上ダッシュボード
- [ ] レート履歴管理
- [ ] エクスポート機能

## 🎯 最初の実装推奨事項

1. **UserSettingsテーブルの拡張から開始**
2. **シンプルなレート取得API実装**
3. **既存の決済フローに最小限の変更でレート保存**
4. **段階的にプラグイン化**

これにより、既存システムへの影響を最小限に抑えながら、課税売上対応を実現できます。
