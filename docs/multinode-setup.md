# Symbolマルチノード構成設定ガイド

このプロジェクトではSymbolブロックチェーンの決済監視において、マルチノード構成による高可用性を実現しています。

## 📋 基本ノード構成

デフォルトで以下の4つのノードが設定されています：

| Priority | ノード名 | デフォルトURL | 用途 |
|----------|---------|---------------|------|
| 1 | Local Node | http://localhost:3000 | ローカル開発用 |
| 2 | Primary External | https://sym-test-01.opening-line.jp:3001 | メインノード |
| 3 | Backup 1 | https://001-sai-dual.symboltest.net:3001 | バックアップ1 |
| 4 | Backup 2 | https://symboltest.nemtus.com:3001 | バックアップ2 |

## 🔧 環境変数による設定

### 基本ノードの設定

各ノードの設定は環境変数で上書き可能です：

```bash
# ローカルノード（Priority 1）
SYMBOL_NODE_LOCAL_URL=http://localhost:3000
SYMBOL_NODE_LOCAL_TIMEOUT=2000
SYMBOL_NODE_LOCAL_NAME=Local Node
SYMBOL_NODE_LOCAL_REGION=local

# プライマリノード（Priority 2）
SYMBOL_NODE_PRIMARY_URL=https://your-primary-node.com:3001
SYMBOL_NODE_PRIMARY_TIMEOUT=5000
SYMBOL_NODE_PRIMARY_NAME=Your Primary Node
SYMBOL_NODE_PRIMARY_REGION=asia

# バックアップノード1（Priority 3）
SYMBOL_NODE_BACKUP1_URL=https://your-backup1-node.com:3001
SYMBOL_NODE_BACKUP1_TIMEOUT=5000
SYMBOL_NODE_BACKUP1_NAME=Your Backup 1
SYMBOL_NODE_BACKUP1_REGION=asia

# バックアップノード2（Priority 4）
SYMBOL_NODE_BACKUP2_URL=https://your-backup2-node.com:3001
SYMBOL_NODE_BACKUP2_TIMEOUT=5000
SYMBOL_NODE_BACKUP2_NAME=Your Backup 2
SYMBOL_NODE_BACKUP2_REGION=asia
```

### 追加カスタムノードの設定

最大10個の追加ノード（Priority 5-14）を設定できます：

```bash
# カスタムノード1（Priority 5）
SYMBOL_CUSTOM_NODE_URL_1=https://custom-node-1.example.com:3001
SYMBOL_CUSTOM_NODE_TIMEOUT_1=5000
SYMBOL_CUSTOM_NODE_NAME_1=Custom Node 1
SYMBOL_CUSTOM_NODE_REGION_1=europe

# カスタムノード2（Priority 6）
SYMBOL_CUSTOM_NODE_URL_2=https://custom-node-2.example.com:3001
SYMBOL_CUSTOM_NODE_TIMEOUT_2=5000
SYMBOL_CUSTOM_NODE_NAME_2=Custom Node 2
SYMBOL_CUSTOM_NODE_REGION_2=america
```

### 旧形式の設定（後方互換性）

```bash
# 旧形式（Priority 99で最低優先度）
SYMBOL_CUSTOM_NODE_URL=https://legacy-node.example.com:3001
SYMBOL_CUSTOM_NODE_TIMEOUT=5000
SYMBOL_CUSTOM_NODE_NAME=Legacy Node
SYMBOL_CUSTOM_NODE_REGION=unknown
```

## ⚡ フェイルオーバー設定

```bash
# フェイルオーバー設定（node-config.tsで設定済み）
maxRetries: 3                      # ノードあたりの最大リトライ回数
retryDelay: 1000                   # リトライ間隔（ミリ秒）
healthCheckInterval: 30000         # ヘルスチェック間隔（ミリ秒）
circuitBreakerThreshold: 5         # 連続エラー閾値
circuitBreakerRecoveryTime: 60000  # 回復待ち時間（ミリ秒）
```

## 🔍 動作確認

### 1. 現在のノード設定確認

```typescript
import { getNodeConfig } from './src/lib/symbol/node-config'

const nodes = getNodeConfig()
console.log('設定されたノード:', nodes)
```

### 2. マルチノード動作テスト

```bash
# 開発サーバー起動
npm run dev

# ログで以下のようなメッセージを確認
# 🔄 ノード試行: Primary External
# ✅ ノード成功: Primary External (150ms)
```

### 3. フェイルオーバーテスト

プライマリノードを停止して、自動的にバックアップノードに切り替わることを確認できます。

## 📊 ログメッセージ例

```
📊 Symbolノードヘルス状況:
  ✅ Primary External
     応答時間: 150ms, エラー数: 0
  ✅ Backup 1
     応答時間: 200ms, エラー数: 0
  ❌ Backup 2
     応答時間: 0ms, エラー数: 3
     最新エラー: タイムアウト: 5000ms
```

## 🛠️ 本番環境での推奨設定

```bash
# .env.production
SYMBOL_NODE_LOCAL_URL=                    # ローカルノードは無効化
SYMBOL_NODE_PRIMARY_URL=https://your-main-node.com:3001
SYMBOL_NODE_BACKUP1_URL=https://your-backup1.com:3001
SYMBOL_NODE_BACKUP2_URL=https://your-backup2.com:3001

# 追加の高性能ノード
SYMBOL_CUSTOM_NODE_URL_1=https://premium-node-1.com:3001
SYMBOL_CUSTOM_NODE_URL_2=https://premium-node-2.com:3001
```

この設定により、Symbol決済システムの可用性と信頼性が大幅に向上します。
