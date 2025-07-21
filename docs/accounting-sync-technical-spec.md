# 会計ソフト同期機能 - 技術仕様補足

## API設計案

### 1. RESTful API エンドポイント

```typescript
// 同期設定関連
GET    /api/accounting/settings           // 設定一覧取得
POST   /api/accounting/settings           // 設定作成
PUT    /api/accounting/settings/:id       // 設定更新
DELETE /api/accounting/settings/:id       // 設定削除

// OAuth認証関連
GET    /api/accounting/auth/:provider     // 認証URL取得
POST   /api/accounting/auth/callback      // 認証コールバック
POST   /api/accounting/auth/refresh       // トークン更新

// 同期実行関連
POST   /api/accounting/sync               // 手動同期実行
GET    /api/accounting/sync/status/:id    // 同期状況取得
POST   /api/accounting/sync/test          // テスト同期

// 履歴関連
GET    /api/accounting/history            // 同期履歴一覧
GET    /api/accounting/history/:id        // 履歴詳細
POST   /api/accounting/history/:id/retry  // 失敗分再実行

// プレビュー関連
POST   /api/accounting/preview            // 同期対象データプレビュー
```

### 2. フロントエンド画面構成

```
/settings/accounting/              # 会計ソフト設定トップ
├── /setup                        # 初期設定ウィザード
├── /oauth/:provider              # OAuth認証画面
├── /configure                    # 詳細設定
├── /test                         # テスト同期
├── /sync                         # 手動同期実行
└── /history                      # 同期履歴
```

### 3. コンポーネント設計

```typescript
// メインコンポーネント
components/accounting/
├── AccountingSettings.tsx        // 設定管理画面
├── SyncWizard.tsx               // 初期設定ウィザード
├── SyncExecution.tsx            // 同期実行画面
├── SyncHistory.tsx              // 履歴一覧
├── SyncStatus.tsx               // リアルタイム状況
├── ProviderConfig/              # プロバイダ別設定
│   ├── FreeeConfig.tsx
│   ├── MoneyForwardConfig.tsx
│   └── YayoiConfig.tsx
└── common/
    ├── SyncProgressBar.tsx      // 進捗表示
    ├── ErrorDisplay.tsx         // エラー表示
    └── DataPreview.tsx          // データプレビュー
```

## 実装優先度の詳細

### 🚀 Phase 1: 基盤機能（必須）
**目標**: 会計ソフト同期の基本的な仕組みを構築

**含まれる機能**:
- データベーススキーマ実装
- 設定管理API・UI
- CSV/Excelエクスポート（汎用対応）
- 基本的なデータ変換ロジック

**成果物**:
- 取引データをCSV形式でエクスポート可能
- 基本的な会計設定（税率、勘定科目）の管理
- シンプルな期間指定・フィルター機能

### ⭐ Phase 2: freee連携（高優先）
**目標**: 国内シェア上位のfreeeとの自動連携

**含まれる機能**:
- freee OAuth認証実装
- freee API連携（取引登録）
- 手動同期機能
- エラーハンドリング基本版

**成果物**:
- freeeアカウントとの認証・連携
- 確認済み取引の手動同期
- 同期結果の表示・確認

### 🔧 Phase 3: 拡張・運用機能（中優先）
**目標**: 実用的な運用機能の追加

**含まれる機能**:
- 自動同期（スケジュール実行）
- 同期履歴管理・エラー追跡
- マネーフォワード連携
- レート取得・換算機能

**成果物**:
- 日次/週次の自動同期
- 詳細な履歴・エラー管理
- 複数会計ソフト対応

### 🌟 Phase 4: 最適化・完成（低優先）
**目標**: パフォーマンス・UX向上

**含まれる機能**:
- 弥生会計連携
- バッチ処理最適化
- 高度なフィルター・設定
- 管理者向け監視機能

## 技術的検討事項

### 1. XYM/JPY換算レート取得
```typescript
interface ExchangeRateService {
  // CoinGecko API, CoinMarketCap API等を利用
  getCurrentRate(): Promise<number>;
  getHistoricalRate(date: Date): Promise<number>;
  
  // 設定可能な換算方式
  // - リアルタイム取得
  // - 月初レート固定
  // - 手動設定レート
}
```

### 2. 税務処理の考慮点
- **消費税**: 標準税率10%、軽減税率8%への対応
- **所得税**: 暗号資産売上の雑所得・事業所得分類
- **記帳方式**: 現金主義・発生主義の選択

### 3. データ整合性の担保
```typescript
// 冪等性の確保
interface SyncTransaction {
  idempotencyKey: string;  // 重複実行防止
  checksum: string;        // データ整合性確認
  version: number;         // 楽観的ロック
}
```

### 4. 監視・アラート設計
```typescript
interface MonitoringEvent {
  type: 'sync_success' | 'sync_failed' | 'auth_expired';
  severity: 'info' | 'warning' | 'error';
  userId: string;
  providerId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

## UI/UXモックアップの方向性

### 設定画面のイメージ
```
┌─────────────────────────────────────────┐
│ 会計ソフト連携設定                         │
├─────────────────────────────────────────┤
│ [freee]     [マネフォ]     [弥生]         │
│   ✓接続済み    未接続       未接続        │
│                                         │
│ ■ 自動同期: ON  [日次 ▼]                 │
│ ■ 税率: 10%                             │
│ ■ 勘定科目: 売上高                       │
│                                         │
│ [手動同期実行] [履歴確認] [テスト同期]     │
└─────────────────────────────────────────┘
```

### 同期実行画面のイメージ
```
┌─────────────────────────────────────────┐
│ 同期実行中... freee                      │
├─────────────────────────────────────────┤
│ ████████████████░░░░ 78% (156/200件)     │
│                                         │
│ ✓ 成功: 145件                           │
│ ⚠ スキップ: 11件                        │
│ ✗ エラー: 0件                           │
│                                         │
│ 最新: 2025/07/20 15:30 商品A売上 ¥1,200 │
│                                         │
│ [一時停止] [詳細表示]                    │
└─────────────────────────────────────────┘
```

これらの要件定義に基づいて、段階的に実装を進めていくことで、実用的な会計ソフト同期機能を構築できます。まずはPhase 1から始めて、ユーザーフィードバックを得ながら機能を拡張していく戦略を推奨します。
