# Test Scripts / テストスクリプト

このフォルダには、XYMPayの開発・テスト・デバッグ用のスクリプトが整理されています。

## 📁 ファイル分類

### 🧪 テスト関連 (test-*)
- **API テスト**: APIエンドポイントの動作確認
  - `test-api-transactions.js` - 取引履歴API
  - `test-settings-api.js` - 設定API
  - `test-symbol-api.js` - Symbol API接続
  - `test-sse-connection.js` - SSE接続

- **決済テスト**: 決済機能のテスト
  - `test-payment-flow.js` - 決済フロー
  - `test-actual-payment.js` - 実際の決済
  - `test-expired-payment.js` - 期限切れ決済

- **監視テスト**: リアルタイム監視機能
  - `test-realtime-monitoring.js` - リアルタイム監視
  - `test-background-monitoring.js` - バックグラウンド監視
  - `test-current-payment-monitoring.js` - 現在の決済監視

- **その他テスト**:
  - `test-db-transactions.js` - データベース取引
  - `test-period-filter.js` - 期間フィルター
  - `test-hex-decoding.js` - 16進数デコード

### 🔍 チェック関連 (check-*)
- **決済チェック**: 決済状態の確認
  - `check-payment-status.js` - 決済ステータス
  - `check-payment-mismatch.js` - 決済不整合
  - `check-expired-payment.js` - 期限切れ決済

- **データチェック**: データ整合性確認
  - `check-existing-data.js` - 既存データ
  - `check-transaction-details.js` - 取引詳細
  - `check-transaction-history.js` - 取引履歴

- **その他チェック**:
  - `check-address-format.js` - アドレス形式
  - `check-symbol-api-direct.js` - Symbol API直接接続

### 🐛 デバッグ関連 (debug-*)
- **決済デバッグ**: 決済関連の問題調査
  - `debug-payment-flow.js` - 決済フロー
  - `debug-payment-simple.js` - シンプル決済
  - `debug-payment-9IUXOBTD.js` - 特定決済のデバッグ

- **データベースデバッグ**:
  - `debug-db.js` - データベース接続・操作

### ⚙️ 作成・設定関連 (create-*, setup-*)
- **決済作成**: テスト用決済の作成
  - `create-payment.js` - 基本決済作成
  - `create-test-payment.js` - テスト決済
  - `create-fresh-test-payment.js` - 新規テスト決済
  - `create-simple-test-payment.js` - シンプルテスト決済

- **設定・初期化**:
  - `setup-test-data.js` - テストデータセットアップ
  - `add-custom-fields.js` - カスタムフィールド追加

### 🔧 その他ユーティリティ
- **監視関連**:
  - `monitor-payment-status.js` - 決済ステータス監視
  - `monitor-realtime.js` - リアルタイム監視

- **検索・調査**:
  - `find-payment-by-message.js` - メッセージから決済検索
  - `search-payment-transactions.js` - 決済取引検索
  - `investigate-payment-amount.js` - 決済金額調査

- **修正・拡張**:
  - `fix-payment-amount.js` - 決済金額修正
  - `extend-payment-expiry.js` - 決済期限延長

- **検証**:
  - `validate-env-config.js` - 環境設定検証
  - `verify-multinode.js` - マルチノード検証

## 🚀 使用方法

```bash
# ルートディレクトリから実行
cd e:\xympay
node test-scripts/[スクリプト名]

# 例: API テスト
node test-scripts/test-api-transactions.js

# 例: 新しいテスト決済作成
node test-scripts/create-fresh-test-payment.js
```

## 📝 注意事項

- これらのスクリプトは開発・テスト専用です
- 本番環境では使用しないでください
- 一部のスクリプトはローカル開発サーバーが起動している必要があります
- データベースへの変更を行うスクリプトは注意して使用してください

## 🗂️ 整理前の場所

これらのファイルは元々ルートディレクトリに配置されていましたが、プロジェクトの整理のため `test-scripts/` フォルダに移動されました。

## 🗂️ 新しいフォルダ構造（2025/07/20 整理済み）

### 📁 payment-tests/
決済機能のテスト・作成スクリプト
- 決済作成テスト
- 決済確認テスト  
- 決済状態チェック

### 📁 api-tests/
API機能のテスト・検証スクリプト
- Dashboard API テスト
- Transaction API テスト
- Settings API テスト

### 📁 debug-tools/
デバッグ・修正ツール
- データベース修正ツール
- 決済データ分析ツール
- エラー診断ツール

### 📁 monitoring-tests/
リアルタイム監視・モニタリングテスト
- 決済監視テスト
- Symbol ブロックチェーン監視
- バックグラウンド処理テスト

### 📁 utilities/
設定・検証・セットアップユーティリティ
- 環境設定検証
- データセットアップ
- システム検証ツール

## 🔄 移動されたファイル

以下のファイルがルートディレクトリから `test-scripts/` に移動されました :
- check-exchange-rate-data.js
- check-payment-data.js  
- check-product-prices.js
- create-2xym-payment.js
- create-session-test-payment.js
- create-test-payment-with-fiat.js
- fix-payment-amounts.js
- list-all-payments.js
- simulate-payment-confirmation.js
- test-amount-check.js
- test-amount-display.js
- test-fiat-value-flow.js
- test-payment-amount.js
- test-session-page.js
- test-tax-summary.js
- test-exchange-rate.mjs
- check-sender-addresses.mjs

**重複ファイルは削除されました。**
