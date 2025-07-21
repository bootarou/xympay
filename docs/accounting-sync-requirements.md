# 会計ソフト同期機能 要件定義書

## 1. 概要

### 1.1 目的
XymPayの取引履歴を主要な会計ソフトと同期し、売上管理・税務処理の自動化を実現する。

### 1.2 対象範囲
- 確認済み取引（status: 'confirmed'）の自動同期
- 手動同期・バッチ同期の両方をサポート
- 主要会計ソフトとの連携（freee、マネーフォワード、弥生会計など）

## 2. 機能要件

### 2.1 対応会計ソフト（優先順位順）
1. **freee（フリー）** - API連携
2. **マネーフォワード クラウド会計** - API連携  
3. **弥生会計オンライン** - API連携
4. **CSV/Excel エクスポート** - 汎用形式対応

### 2.2 同期対象データ
```typescript
interface AccountingData {
  // 基本取引情報
  transactionDate: Date;        // 取引日（confirmedAt）
  amount: number;               // 金額（XYM）
  amountJPY: number;           // 日本円換算額
  exchangeRate: number;        // 使用レート
  
  // 商品・サービス情報
  productName: string;         // 商品名
  productCategory?: string;    // 商品カテゴリ
  
  // 取引詳細
  paymentId: string;          // 決済ID
  transactionId?: string;     // Symbol TxHash
  senderAddress?: string;     // 送信者アドレス
  
  // 会計情報
  taxType: 'inclusive' | 'exclusive' | 'exempt'; // 税区分
  taxRate: number;            // 税率
  accountCode?: string;       // 勘定科目コード
  
  // メタデータ
  memo?: string;              // 摘要
  tags?: string[];           // タグ
}
```

### 2.3 主要機能

#### 2.3.1 同期設定管理
```typescript
interface SyncSettings {
  id: string;
  userId: string;
  provider: 'freee' | 'mf' | 'yayoi' | 'csv';
  isEnabled: boolean;
  
  // 認証情報
  accessToken?: string;
  refreshToken?: string;
  companyId?: string;
  
  // 同期設定
  autoSync: boolean;           // 自動同期ON/OFF
  syncFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  lastSyncAt?: Date;
  
  // 会計設定
  defaultTaxRate: number;      // デフォルト税率
  defaultAccountCode: string;  // デフォルト勘定科目
  exchangeRateSource: 'manual' | 'api'; // レート取得方法
  
  // フィルター設定
  minAmount?: number;          // 最小同期金額
  excludeStatuses?: string[];  // 除外ステータス
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.3.2 同期履歴管理
```typescript
interface SyncHistory {
  id: string;
  userId: string;
  settingsId: string;
  
  // 同期実行情報
  syncType: 'manual' | 'auto' | 'batch';
  status: 'success' | 'failed' | 'partial';
  startedAt: Date;
  completedAt?: Date;
  
  // 同期結果
  totalRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  
  // 対象期間
  dateFrom: Date;
  dateTo: Date;
  
  // エラー情報
  errors?: SyncError[];
  summary?: string;
  
  createdAt: Date;
}

interface SyncError {
  paymentId: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}
```

### 2.4 UI/UX要件

#### 2.4.1 設定画面
- **会計ソフト選択**: ラジオボタンまたはカード形式
- **認証フロー**: OAuth2.0対応、安全な認証
- **同期設定**: 頻度、税率、勘定科目の設定
- **テスト同期**: 設定確認用の少量データ同期

#### 2.4.2 同期実行画面
- **手動同期**: 期間指定、対象データプレビュー
- **実行状況**: プログレスバー、リアルタイム更新
- **結果表示**: 成功/失敗件数、エラー詳細

#### 2.4.3 履歴管理画面
- **同期履歴一覧**: 日時、ステータス、件数
- **詳細表示**: エラー内容、再試行ボタン
- **フィルター**: 期間、ステータス、同期種別

## 3. 技術要件

### 3.1 API連携仕様

#### 3.1.1 freee API連携
```typescript
// 取引登録例
POST /api/1/deals
{
  "company_id": 123456,
  "issue_date": "2025-07-20",
  "due_date": "2025-07-20",
  "partner_id": 456789,
  "ref_number": "XYM-PAYMENT-ABC123",
  "details": [
    {
      "account_item_id": 12345,
      "tax_code": 10001,
      "amount": 1000,
      "description": "XymPay売上 - 商品名"
    }
  ]
}
```

#### 3.1.2 マネーフォワード API連携
```typescript
// 仕訳登録例
POST /api/external/v1/journals
{
  "company_id": "abc123",
  "dept_id": "dept001",
  "date": "2025-07-20",
  "txn_number": "XYM-ABC123",
  "memo": "XymPay売上",
  "debits": [
    {
      "account_code": "1110",
      "amount": 1000,
      "tax_type": "inclusive"
    }
  ],
  "credits": [
    {
      "account_code": "4110", 
      "amount": 1000,
      "tax_type": "inclusive"
    }
  ]
}
```

### 3.2 データベース設計
```sql
-- 同期設定テーブル
CREATE TABLE accounting_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(20) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  access_token TEXT,
  refresh_token TEXT,
  company_id VARCHAR(100),
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency VARCHAR(20) DEFAULT 'daily',
  last_sync_at TIMESTAMP,
  default_tax_rate DECIMAL(5,2) DEFAULT 10.00,
  default_account_code VARCHAR(50),
  exchange_rate_source VARCHAR(20) DEFAULT 'api',
  min_amount DECIMAL(15,6),
  exclude_statuses TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 同期履歴テーブル
CREATE TABLE accounting_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  settings_id UUID NOT NULL REFERENCES accounting_sync_settings(id),
  sync_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  total_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  date_from TIMESTAMP,
  date_to TIMESTAMP,
  errors JSONB,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 同期済み取引追跡テーブル
CREATE TABLE synced_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payment(id),
  settings_id UUID NOT NULL REFERENCES accounting_sync_settings(id),
  external_id VARCHAR(255), -- 会計ソフト側のID
  synced_at TIMESTAMP NOT NULL,
  sync_data JSONB, -- 送信したデータのコピー
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payment_id, settings_id)
);
```

### 3.3 セキュリティ要件
- **認証情報の暗号化**: アクセストークンの安全な保存
- **通信の暗号化**: HTTPS必須、API通信の暗号化
- **権限管理**: ユーザー単位での設定管理
- **ログ管理**: 同期処理の詳細ログ記録

## 4. 非機能要件

### 4.1 パフォーマンス
- **バッチ処理**: 大量データの効率的な同期
- **レート制限**: 各APIの制限内での実行
- **リトライ機能**: 一時的な障害への対応

### 4.2 可用性
- **エラーハンドリング**: 適切なエラー処理と復旧
- **モニタリング**: 同期状況の監視機能
- **アラート**: 失敗時の通知機能

### 4.3 運用性
- **ログ出力**: 詳細な実行ログ
- **設定管理**: 管理者による設定変更機能
- **メンテナンス**: 定期的なトークン更新

## 5. 実装フェーズ

### Phase 1: 基盤実装（4-6週間）
- データベーススキーマ設計・実装
- 設定管理UI作成
- CSV/Excelエクスポート機能

### Phase 2: freee連携（3-4週間）
- freee API連携実装
- OAuth認証フロー
- 手動同期機能

### Phase 3: 拡張機能（3-4週間）
- 自動同期機能
- 履歴管理・エラーハンドリング
- マネーフォワード連携

### Phase 4: 最適化（2-3週間）
- パフォーマンス改善
- 弥生会計連携
- 運用監視機能

## 6. リスク・制約事項

### 6.1 技術的リスク
- **API仕様変更**: 各社APIの変更への対応
- **レート制限**: API呼び出し制限による処理遅延
- **データ整合性**: 同期中のデータ変更への対応

### 6.2 運用リスク
- **認証期限**: アクセストークンの期限切れ
- **会計ソフト障害**: 外部サービス障害への対応
- **データ重複**: 重複同期の防止

### 6.3 制約事項
- **XYM/JPY換算**: 正確な換算レートの取得
- **税法対応**: 暗号資産の税務処理規則への準拠
- **会計基準**: 各社会計ソフトの仕様差異

## 7. 成功指標

- **同期成功率**: 95%以上
- **処理時間**: 100件あたり5分以内
- **ユーザー満足度**: アンケート4.0以上（5点満点）
- **利用率**: アクティブユーザーの30%以上が利用
