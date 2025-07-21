# XYMPay - Symbol Payment System

![XYMPay Logo](https://via.placeholder.com/150x75/0066cc/ffffff?text=XYMPay)

XYMPay is a payment system built on the Symbol blockchain, providing e-commerce product sales and payment functionality.

## 🚀 Features

- **Product Management**: Product registration, editing, and inventory management
- **Custom Forms**: Configurable input fields per product
- **Two-Phase Payment Flow**: Information input → Payment execution
- **Inventory Lock**: Stock reservation during payment process
- **Symbol Payments**: QR code and address-based payments
- **Real-time Payment Confirmation**: SSE/polling-based payment status monitoring
- **Product Sharing**: SNS posts and URL sharing for product promotion
- **Notifications**: Email notifications for payment completion and expiration
- **Statistics & Analytics**: Transaction history with period-based statistics
- **Accounting Software Integration**: Integration with freee/Money Forward/Yayoi/CSV export

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Symbol SDK for blockchain integration
- **Payment**: Symbol blockchain native payments
- **Authentication**: NextAuth.js with multiple providers

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Symbol testnet/mainnet access
- (Optional) OAuth credentials for accounting integrations

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/xympay.git
cd xympay
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/xympay"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Symbol Network
SYMBOL_NETWORK_TYPE="testnet"
SYMBOL_GENERATION_HASH="your-generation-hash"
SYMBOL_NODE_PRIMARY_URL="https://sym-test-01.opening-line.jp:3001"

# OAuth (Optional - for accounting integration)
FREEE_CLIENT_ID="your_freee_client_id"
FREEE_CLIENT_SECRET="your_freee_client_secret"
FREEE_REDIRECT_URI="http://localhost:3000/api/accounting/oauth/callback"
```

### 4. Database setup

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### テストデータの準備

```bash
# 商品とユーザーのテストデータを作成
node test-scripts/add-custom-fields.js

# テスト決済を作成
node test-scripts/create-test-payment.js

# データベースの状態確認
node test-scripts/debug-db.js

# 取引履歴API のテスト
node test-scripts/test-api-transactions.js

# 設定API のテスト
node test-scripts/test-settings-api.js
```

## 決済システムの仕様

### 決済フロー

XYMPayは2段階の決済フローを採用しています：

1. **Step1 - 情報入力フェーズ**
   - カスタムフィールドへの入力
   - バリデーション
   - フォームデータの保存

2. **Step2 - 決済実行フェーズ**
   - QRコード表示
   - Symbol決済の実行
   - リアルタイム決済確認

### 在庫ロック・タイムアウト仕様

#### 📋 概要
決済プロセス中の在庫確保と不正な重複購入を防ぐため、段階的なタイムアウト機能を実装しています。

#### ⏰ タイムアウト設定

| フェーズ | 制限時間 | 在庫状態 | 説明 |
|---------|---------|---------|------|
| **Step1 開始時** | 15分 | ロック | 決済ページアクセス時に在庫をロック |
| **Step2 移行時** | 5分 | ロック継続 | フォーム送信完了時に期限を短縮 |
| **決済完了・期限切れ** | - | ロック解除 | 在庫を元に戻すまたは確定 |

#### 🔄 詳細フロー

```
1. 決済ページアクセス
   ↓
   在庫チェック → 在庫確保（-1） → 15分タイマー開始
   ↓
2. Step1: カスタムフィールド入力（最大15分）
   ↓
   フォーム送信
   ↓
3. Step2移行時
   ↓
   期限を現在時刻+5分に短縮 → タイマーリセット
   ↓
4. Step2: Symbol決済実行（最大5分）
   ↓
5a. 決済完了 → 在庫確定        5b. 期限切れ → 在庫返却（+1）
```

#### 💡 設計理念

**なぜ段階的タイムアウト？**

- **Step1 (15分)**: ユーザーがカスタムフィールドをじっくり入力できる十分な時間
- **Step2 (5分)**: 決済実行に適切な制限時間（長すぎると在庫ロックが無駄になる）

**在庫ロックのタイミング**

1. **早期ロック（決済ページアクセス時）**
   - ✅ 確実な在庫確保
   - ✅ カートに入れた時点での在庫保証
   - ❌ Step1で離脱した場合の在庫無駄ロック

2. **遅延ロック（Step2移行時）** ※不採用
   - ✅ 無駄な在庫ロックを削減
   - ❌ Step1完了時に在庫切れの可能性
   - ❌ ユーザー体験の悪化

→ **早期ロック + 段階的タイムアウト** を採用

#### 🚨 エラーハンドリング

| エラーケース | 原因 | 対処法 |
|-------------|------|--------|
| `決済の状態が更新可能ではありません` | 決済が期限切れ | 新しい決済を作成 |
| `在庫が不足しています` | 在庫数 < 1 | 在庫補充または販売停止 |
| `決済情報が見つかりません` | 無効な決済ID | URLの確認 |

#### 📊 カウントダウンタイマー

**表示仕様**
- **位置**: 決済ページヘッダー右上
- **フォーマット**: `MM:SS`
- **更新頻度**: 1秒ごと
- **色分け**:
  - 通常: 白色
  - 残り1分以下: 黄色（警告）
  - 期限切れ: 赤色

**動作**
```javascript
// リアルタイム更新
useEffect(() => {
  const timer = setInterval(() => {
    const remaining = expireTime - currentTime
    // 残り時間を計算・表示更新
  }, 1000)
}, [paymentInfo])
```

#### 🔧 実装詳細

**データベース構造**
```sql
-- payments テーブル
{
  paymentId: string,    -- 決済ID
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled',
  expireAt: DateTime,   -- 期限時刻
  formData: Json,       -- Step1で入力されたフォームデータ
  amount: Float,        -- 決済金額
  -- ...
}
```

**期限短縮API**
```typescript
// PUT /api/payment/form/[paymentId]
const newExpireAt = new Date(Date.now() + 5 * 60 * 1000) // 現在+5分

await prisma.payment.update({
  where: { paymentId },
  data: {
    formData: JSON.stringify(formData),
    expireAt: newExpireAt  // 期限短縮
  }
})
```

#### 🧪 テスト手順

1. **正常フロー**
   ```bash
   # 新しい決済作成
   node create-test-payment.js
   
   # 決済ページにアクセス
   # 1. カウントダウン15:00から開始を確認
   # 2. カスタムフィールド入力
   # 3. 「次へ進む」クリック
   # 4. カウントダウン05:00に短縮されることを確認
   # 5. QRコード決済実行
   ```

2. **期限切れテスト**
   ```bash
   # テスト用に期限を短縮（create-test-payment.jsで1分に設定）
   # 1. 決済ページアクセス
   # 2. 1分間放置
   # 3. 期限切れ表示・ボタン無効化を確認
   ```

#### 📈 今後の拡張予定

- **在庫予約システム**: Step1で仮予約、Step2で本予約
- **決済リトライ機能**: 期限切れ時の自動延長オプション
- **バックグラウンド在庫管理**: 定期的な期限切れ決済のクリーンアップ
- **分析機能**: Step1→Step2の変換率、期限切れ率の追跡

## カスタムフィールド仕様

### サポートするフィールドタイプ

- `text`: 一行テキスト
- `email`: メールアドレス（バリデーション付き）
- `number`: 数値
- `tel`: 電話番号
- `url`: URL
- `date`: 日付
- `textarea`: 複数行テキスト
- `select`: 選択肢（ドロップダウン）
- `radio`: ラジオボタン
- `checkbox`: チェックボックス

### 商品編集でのカスタムフィールド設定

1. 商品編集ページでカスタムフィールドを追加
2. フィールド名、タイプ、必須可否を設定
3. 選択肢タイプの場合はオプションを設定
4. 商品保存時にカスタムフィールドがDBに保存

### 決済ページでの動的レンダリング

- 商品に設定されたカスタムフィールドを自動取得
- フィールドタイプに応じた適切な入力UIを動的生成
- クライアントサイドバリデーション
- Step1でフォームデータを収集・保存

## データベース設計

### 主要テーブル

```sql
-- 商品テーブル
model Product {
  id          String   @id @default(cuid())
  uuid        String   @unique @default(uuid())
  name        String
  price       Float
  stock       Int
  customFields ProductCustomField[]
  // ...
}

-- 商品カスタムフィールド
model ProductCustomField {
  id          String   @id @default(cuid())
  productId   String
  fieldName   String
  fieldType   String
  isRequired  Boolean  @default(false)
  options     Json?
  product     Product  @relation(fields: [productId], references: [id])
  // ...
}

-- 決済テーブル
model Payment {
  id          String   @id @default(cuid())
  paymentId   String   @unique
  productId   String
  status      PaymentStatus
  amount      Float
  expireAt    DateTime
  formData    Json     @default("{}")
  // ...
}
```

## API仕様

### 商品管理API

- `GET /api/products` - 商品一覧取得
- `POST /api/products` - 商品作成（カスタムフィールド含む）
- `GET /api/products/[id]` - 商品詳細取得
- `PUT /api/products/[id]` - 商品更新（カスタムフィールド含む）

### 決済API

- `GET /api/payment/status/[paymentId]` - 決済状況取得
- `PUT /api/payment/form/[paymentId]` - フォームデータ保存・期限短縮
- `GET /api/payment/sse/[paymentId]` - リアルタイム決済監視（SSE）

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## システム構成

### 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Prisma ORM
- **データベース**: PostgreSQL (または Prisma対応DB)
- **ブロックチェーン**: Symbol Network
- **認証**: NextAuth.js
- **リアルタイム通信**: Server-Sent Events (SSE)

### プロジェクト構造

```
src/
├── app/                          # App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # 認証API
│   │   ├── products/             # 商品管理API
│   │   ├── payment/              # 決済API
│   │   ├── transactions/         # 取引履歴API
│   │   └── settings/             # 設定API
│   ├── login/                    # ログインページ
│   ├── register/                 # 登録ページ
│   ├── products/                 # 商品管理ページ
│   │   └── [id]/edit/           # 商品編集ページ
│   ├── payment/                 # 決済ページ
│   │   ├── [paymentId]/         # 決済ID指定
│   │   └── session/[sessionKey]/ # セッション指定
│   ├── transactions/            # 取引履歴ページ
│   └── settings/                # 設定ページ
├── lib/                         # ユーティリティ
│   ├── auth.ts                  # 認証設定
│   ├── prisma.ts                # Prisma設定
│   └── symbol/                  # Symbol関連
├── hooks/                       # カスタムフック
│   ├── useSettings.ts           # 設定管理フック
│   └── useTransactions.ts       # 取引履歴フック
└── components/                  # 共通コンポーネント

prisma/
└── schema.prisma               # データベーススキーマ

test-scripts/                   # 開発・テスト用スクリプト
├── README.md                   # スクリプト説明書
├── test-*.js                   # テスト用スクリプト
├── debug-*.js                  # デバッグ用スクリプト
├── check-*.js                  # チェック用スクリプト
├── create-*.js                 # 作成用スクリプト
└── monitor-*.js                # 監視用スクリプト
```

## 環境変数設定

### 必須環境変数

```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/xympay"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Symbol Network設定
SYMBOL_NETWORK="testnet"  # mainnet | testnet
SYMBOL_NODE_URL="https://sym-test-03.opening-line.jp:3001"
SYMBOL_GENERATION_HASH="7FCCD304802016BEBBCD342A332F91FF1F3BB5E902988B352697BE245F48E836"

# 決済設定
DEFAULT_PAYMENT_TIMEOUT_MINUTES=15
STEP2_PAYMENT_TIMEOUT_MINUTES=5
```

### オプション環境変数

```bash
# 開発用設定
DEBUG_MODE=true
LOG_LEVEL="debug"

# メール通知（将来実装予定）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## セキュリティ考慮事項

### 🔐 認証・認可

- **NextAuth.js**による安全な認証システム
- **CSRF保護**がデフォルトで有効
- **セッション管理**による状態保持

### 💰 決済セキュリティ

- **決済ID**はUUIDv4でランダム生成
- **期限切れ自動処理**による不正決済防止
- **在庫ロック機能**による重複購入防止
- **金額検証**をサーバーサイドで実施

### 🛡️ データ保護

```typescript
// 機密情報のマスキング例
const maskedPaymentId = paymentId.slice(0, 8) + '...'
const maskedAddress = address.slice(0, 6) + '...' + address.slice(-4)
```

### 🚨 レート制限

```typescript
// API Rate Limiting (実装推奨)
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // リクエスト数上限
}
```

## 運用・監視

### � 通知機能

#### メール通知の設定

```bash
# .env.localに以下の環境変数を追加
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### 通知タイプ

- **決済完了通知** (`payment_confirmed`)
  - 決済が正常に確認された際に送信
  - 決済ID、商品名、金額、取引IDなどを含む
  
- **決済期限切れ通知** (`payment_expired`)
  - 決済期限が切れた際に送信
  - 再購入の案内を含む

- **テスト通知** (`test`)
  - 設定ページから手動で送信可能
  - メール設定の動作確認用

#### 通知設定の管理

```typescript
// ダッシュボードでの設定
const settings = {
  notifications: true,        // 一般通知の有効/無効
  emailNotifications: true    // メール通知の有効/無効
}
```

#### 通知機能のテスト

```bash
# 通知機能の状態確認
node test-scripts/notification-tests/test-notification-features.mjs

# 設定ページでテスト送信ボタンをクリック
# または API直接呼び出し
POST /api/notifications/test
```

### �📊 ログ設定

```typescript
// コンソールログの例
console.log('=== 決済開始 ===')
console.log('paymentId:', paymentId)
console.log('商品:', product.name)
console.log('金額:', amount, 'XYM')
```

### 🔍 デバッグ用コマンド

```bash
# 決済状況の確認
node check-payment-status.js

# 期限切れ決済のクリーンアップ
node cleanup-expired-payments.js

# 在庫整合性チェック
node verify-stock-consistency.js

# 通知機能のテスト
node test-scripts/notification-tests/test-notification-features.mjs

# 決済設定のテスト
node test-scripts/debug-tools/test-payment-settings.js
```

### 📈 パフォーマンス監視

- **決済完了率**: Step1→Step2→完了の変換率
- **平均決済時間**: Step1開始から決済完了まで
- **期限切れ率**: タイムアウトによる決済失敗率
- **在庫回転率**: 商品別の販売パフォーマンス

## トラブルシューティング

### よくある問題と解決法

#### 🚫 「決済の状態が更新可能ではありません」エラー

**原因**: 決済が期限切れまたは完了済み

**解決法**:
```bash
# 1. 新しい決済を作成
node create-test-payment.js

# 2. 期限延長（開発時のみ）
# データベースで直接expireAtを更新
```

#### 🔄 QRコードが表示されない

**原因**: Symbol関連の設定問題

**チェック項目**:
```bash
# 1. Symbol Node URLの確認
curl -X GET "https://sym-test-03.opening-line.jp:3001/node/info"

# 2. ネットワーク設定確認
echo $SYMBOL_NETWORK

# 3. QRコード生成ライブラリの確認
npm list qrcode
```

#### 📦 在庫数がマイナスになる

**原因**: 同時リクエストによる競合状態

**対策**:
```sql
-- データベースレベルでの制約
ALTER TABLE products ADD CONSTRAINT check_stock_positive CHECK (stock >= 0);
```

#### 🔄 SSEが接続されない

**チェック項目**:
```javascript
// ブラウザの開発者ツールで確認
const eventSource = new EventSource('/api/payment/sse/[paymentId]')
eventSource.onopen = () => console.log('SSE Connected')
eventSource.onerror = (e) => console.error('SSE Error:', e)
```

### 📋 システム要件

#### 最小要件
- **Node.js**: 18.0.0以上
- **npm**: 8.0.0以上
- **PostgreSQL**: 12.0以上
- **メモリ**: 512MB以上

#### 推奨要件
- **Node.js**: 20.0.0以上
- **PostgreSQL**: 15.0以上
- **メモリ**: 2GB以上
- **CPU**: 2コア以上

### 🔧 開発時のTips

#### コード品質
```bash
# ESLint + Prettier
npm run lint
npm run format

# 型チェック
npm run type-check

# テスト実行
npm run test
```

#### データベース操作
```bash
# スキーマ変更の適用
npx prisma db push

# マイグレーション作成
npx prisma migrate dev --name add_custom_fields

# Prisma Studio（GUI）
npx prisma studio
```

#### デバッグ設定
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js Debug",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    }
  ]
}
```

## パフォーマンス最適化

### 📊 データベース最適化

```sql
-- インデックス作成
CREATE INDEX idx_payments_status_expire ON payments(status, "expireAt");
CREATE INDEX idx_products_stock ON products(stock) WHERE stock > 0;
CREATE INDEX idx_custom_fields_product ON "ProductCustomField"("productId");
```

### ⚡ フロントエンド最適化

```typescript
// 画像最適化
import Image from 'next/image'

// コード分割
const PaymentPage = dynamic(() => import('./PaymentPage'), {
  loading: () => <Loading />
})

// メモ化
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* 重い処理 */}</div>
})
```

### 🔄 キャッシュ戦略

```typescript
// Next.js Cache設定
export const revalidate = 60 // 60秒キャッシュ

// API Response Cache
res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
```

## ブロックチェーン連携（Symbol）

### Symbol決済の仕組み

XYMPayは**Symbol Network**を使用してブロックチェーン決済を実現しています。

#### 🔗 決済フロー詳細

```
1. QRコード生成
   ↓
2. ユーザーがSymbolウォレットで読み取り
   ↓
3. 送金トランザクション作成・署名
   ↓
4. Symbol Networkに送信
   ↓
5. ブロック承認（約15秒）
   ↓
6. XYMPay側で決済確認・完了処理
```

#### 📱 QRコード仕様

```typescript
interface SymbolQRData {
  v: number                    // バージョン
  type: number                // トランザクションタイプ
  network_id: number          // ネットワークID
  chain_id: string           // チェーンID
  data: {
    payload: {
      recipient_address: string // 受取アドレス
      amount: number           // 送金額（マイクロXYM）
      message: string          // メッセージ（決済ID）
      fee?: number            // 手数料
    }
  }
}
```

#### 🔍 決済確認方法

**1. SSE（Server-Sent Events）**
```typescript
// リアルタイム決済監視
const eventSource = new EventSource(`/api/payment/sse/${paymentId}`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.status === 'confirmed') {
    // 決済完了処理
  }
}
```

**2. ポーリング（フォールバック）**
```typescript
// 定期的な決済状況確認
const checkPayment = async () => {
  const response = await fetch(`/api/payment/status/${paymentId}`)
  const data = await response.json()
  return data.status
}
```

### Symbol Network設定

#### テストネット（開発用）
```bash
SYMBOL_NETWORK="testnet"
SYMBOL_NODE_URL="https://sym-test-03.opening-line.jp:3001"
SYMBOL_GENERATION_HASH="7FCCD304802016BEBBCD342A332F91FF1F3BB5E902988B352697BE245F48E836"
```

#### メインネット（本番用）
```bash
SYMBOL_NETWORK="mainnet"
SYMBOL_NODE_URL="https://symbol-mikun.net:3001"
SYMBOL_GENERATION_HASH="57F7DA205008026C776CB6AED843393F04CD458E0AA2D9F1D5F31A402072B2D6"
```

### ウォレット対応状況

| ウォレット | QR対応 | API対応 | 備考 |
|-----------|--------|---------|------|
| **Symbol Wallet (公式)** | ✅ | ✅ | 推奨 |
| **SSS Extension** | ✅ | ✅ | ブラウザ拡張 |
| **Symbol Mobile Wallet** | ✅ | ❌ | モバイル専用 |
| **Harvest Monitor** | ❌ | ✅ | 監視用 |

## 多言語対応（i18n）

### 対応言語

- 🇯🇵 日本語（デフォルト）
- 🇺🇸 English（予定）
- 🇰🇷 한국어（予定）

### 使用方法

```typescript
import { useTranslation } from '../lib/i18n'

const { t } = useTranslation()

// 使用例
<h1>{t('payment.title')}</h1>
<button>{t('common.next')}</button>
```

### 翻訳ファイル構造

```
locales/
├── ja.json                 # 日本語
├── en.json                 # 英語
└── ko.json                 # 韓国語

// ja.json例
{
  "payment": {
    "title": "決済",
    "step1": "情報入力",
    "step2": "決済実行"
  },
  "common": {
    "next": "次へ",
    "back": "戻る",
    "cancel": "キャンセル"
  }
}
```

## テスト戦略

### 🧪 テストレベル

#### Unit Tests
```bash
# Jest + React Testing Library
npm run test:unit

# 対象: コンポーネント、ユーティリティ関数
```

#### Integration Tests
```bash
# API統合テスト
npm run test:integration

# 対象: API Routes、データベース操作
```

#### E2E Tests
```bash
# Playwright
npm run test:e2e

# 対象: 決済フロー全体
```

### 🎯 テストシナリオ

#### 決済フロー
1. **正常フロー**: カスタムフィールド入力 → 決済完了
2. **バリデーションエラー**: 必須項目未入力
3. **期限切れ**: Step1/Step2でのタイムアウト
4. **在庫切れ**: 同時購入による在庫不足
5. **ネットワークエラー**: Symbol Node接続失敗

#### セキュリティテスト
```bash
# SQLインジェクション対策確認
npm run test:security

# CSRF保護確認
npm run test:csrf

# 不正アクセス確認
npm run test:auth
```

## デプロイメント

### 🚀 Vercel（推奨）

```bash
# Vercel CLI
npm i -g vercel
vercel

# 環境変数設定
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add SYMBOL_NODE_URL
```

### 🐳 Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/xympay
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: xympay
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### ☁️ AWS（高可用性）

```yaml
# AWS構成例
VPC:
  - Public Subnet: ALB, NAT Gateway
  - Private Subnet: ECS, RDS
  
Services:
  - ECS Fargate: Next.jsアプリ
  - RDS PostgreSQL: データベース
  - ElastiCache: セッション管理
  - CloudFront: CDN
  - Route53: DNS
```

## 将来の拡張計画

### 🔮 開発ロードマップ

#### Phase 1（完了）✅
- [x] 基本的な商品管理
- [x] カスタムフィールド機能
- [x] 2段階決済フロー
- [x] 在庫ロック機能
- [x] Symbol決済連携

#### Phase 2（進行中）🚧
- [ ] 多言語対応
- [ ] 決済分析ダッシュボード
- [ ] 在庫アラート機能
- [ ] メール通知システム

#### Phase 3（計画中）📋
- [ ] マルチテナント対応
- [ ] 決済手数料設定
- [ ] 定期支払い機能
- [ ] モバイルアプリ

#### Phase 4（検討中）💭
- [ ] 他ブロックチェーン対応
- [ ] NFT販売機能
- [ ] DeFi連携
- [ ] AI価格最適化

### 🎯 技術的改善項目

#### パフォーマンス
- [ ] Redis導入でセッション高速化
- [ ] CDN導入で画像配信最適化
- [ ] データベースクエリ最適化
- [ ] WebAssembly導入でSymbol処理高速化

#### セキュリティ
- [ ] WAF導入
- [ ] 2FA認証
- [ ] 監査ログ機能
- [ ] 暗号化強化

#### 運用性
- [ ] ヘルスチェックAPI
- [ ] メトリクス収集
- [ ] 自動バックアップ
- [ ] 障害通知

## UX・ユーザビリティ仕様

### 🛒 購入者の想定

XYMPayは**非ログインユーザー**による購入を主要な想定ユースケースとしています。

#### 想定シナリオ
```
1. ユーザーが商品リンクをクリック（SNS、メール、QRコード等）
2. 決済ページが新しいタブ/ウィンドウで開く
3. カスタムフィールド入力
4. Symbol決済実行
5. 決済完了後、ウィンドウを閉じる
```

#### キャンセル・終了時の動作

**段階的なウィンドウクローズ処理**
```typescript
const handleClose = () => {
  if (window.opener) {
    // ポップアップとして開かれた場合
    window.close()
  } else if (window.history.length > 1) {
    // 履歴がある場合は戻る
    window.history.back()
  } else {
    // それ以外の場合はユーザー確認後にクローズ
    const confirmed = window.confirm('決済を中止してページを閉じますか？')
    if (confirmed) {
      window.close()
    }
  }
}
```

**適用箇所**
- Step1 キャンセルボタン
- Step2 閉じるボタン  
- エラー時の閉じるボタン

#### 商品一覧の決済UI改善（2025-06-26）

**変更前**: 決済URLをクリップボードにコピー  
**変更後**: 決済ボタンで決済ページを新しいタブで直接開く

**変更理由**:
- URLコピー → 新しいタブ → ペーストの手順が煩雑
- ワンクリックで決済開始できるUXに改善
- モバイル等でのコピー&ペースト操作の困難さを解消

**実装内容**:
```typescript
// 決済ページを新しいタブで開く
const handleOpenPayment = async (product: Product) => {
  // 決済準備API呼び出し
  const response = await fetch(`/api/payment/${product.uuid}`, { /* ... */ })
  const data = await response.json()
  
  // 新しいタブで決済ページを開く
  window.open(`/payment/${data.paymentId}`, '_blank', 'noopener,noreferrer')
}
```

**UI変更**:
- ボタンテキスト: 「決済URL」→「決済」
- ボタン色: 青 → 緑
- アイコン: リンク → 決済
- 処理中表示: ローディングスピナー付き

#### キャンセル時の決済状態管理（2025-06-26）

決済ページでキャンセルボタンを押した際に、サーバー側でも決済をキャンセル状態に更新する機能を追加：

**フロー**:
1. ユーザーがキャンセルボタンクリック
2. 確認ダイアログ表示
3. キャンセルAPI（`POST /api/payment/cancel/[paymentId]`）呼び出し
4. データベース上の決済ステータスを'cancelled'に更新
5. ウィンドウクローズ処理実行

**API仕様**:
```typescript
// POST /api/payment/cancel/[paymentId]
// - 非ログインユーザーも利用可能（paymentIdベースの認証）
// - 在庫ロック解除も同時実行
// - pending状態の決済のみキャンセル可能
```

**UX改善**:
- キャンセル処理中のローディング表示
- エラー発生時も確実にウィンドウクローズ
- pending以外の状態では確認なしでクローズ

## QRコード生成プラグインシステム

XYMPayは柔軟なQRコード生成プラグインシステムを採用し、複数のSymbolウォレットに対応したQRコード生成とユーザーフレンドリーなウォレット選択UIを提供します。

### プラグインアーキテクチャ

#### プラグインマネージャー
```typescript
// プラグインマネージャーによる一元管理
const manager = new QRPluginManager({
  defaultWalletId: 'symbol-mobile',
  enabledPlugins: ['symbol-mobile', 'symbol-desktop', 'symbol-standard'],
  pluginSettings: {}
})

// プラグインの登録
manager.registerPlugins([
  new SymbolMobilePlugin(),
  new SymbolDesktopPlugin(), 
  new SymbolStandardPlugin()
])
```

#### サポートするウォレット

| ウォレット | プラグインID | 対応デバイス | 特徴 |
|-----------|-------------|------------|------|
| **Symbol Mobile** | `symbol-mobile` | 📱 iOS/Android | 公式モバイルアプリ、最適化されたQRサイズ |
| **Symbol Desktop** | `symbol-desktop` | 🖥️ Windows/Mac/Linux | デスクトップ版、大きめQRコード |
| **Symbol Standard** | `symbol-standard` | 🌐 汎用 | 標準仕様、従来互換のQRコード |

### ウォレット選択UI

#### カード型選択インターフェース
決済ページでユーザーが直感的にウォレットを選択できるカード型UIを実装：

```tsx
<WalletSelector
  selectedWalletId={selectedWalletId}
  onWalletSelect={handleWalletSelect}
/>
```

**特徴**
- 🎨 **視覚的なカードデザイン**: 各ウォレットを分かりやすいカードで表示
- ✅ **選択状態の明確化**: チェックマーク付きで選択ウォレットを明示
- 🔄 **リアルタイム切り替え**: ウォレット変更時にQRコードを即座に再生成
- 📱 **レスポンシブ対応**: モバイル・デスクトップ両対応
- 🔗 **ダウンロードリンク**: 未インストールの場合は公式サイトへ誘導

#### QRコード統合表示
```tsx
<PaymentQRDisplay
  paymentData={paymentData}
  onWalletChange={setSelectedWalletId}
  defaultWalletId={selectedWalletId}
/>
```

**機能**
- 🔄 **動的QRコード生成**: ウォレット選択に応じてQRコードを即座に更新
- 📋 **URIコピー機能**: ワンクリックでディープリンクURIをクリップボードにコピー
- 🚀 **ウォレットで開く**: 直接ウォレットアプリを起動するボタン
- ℹ️ **使用方法ガイド**: 選択したウォレットに応じた決済手順を表示

### プラグイン実装仕様

#### プラグインインターフェース
```typescript
interface QRGeneratorPlugin {
  id: string                                // プラグインID
  name: string                              // プラグイン名
  version: string                           // バージョン
  description: string                       // 説明
  wallet: WalletInfo                        // ウォレット情報
  
  canHandle(request: PaymentRequest): boolean           // 対応可能チェック
  generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string>  // QRコード生成
  generateUri(request: PaymentRequest): string         // ディープリンクURI生成
}
```

#### カスタムプラグインの追加
```typescript
// 新しいウォレット用プラグインの実装例
class CustomWalletPlugin implements QRGeneratorPlugin {
  id = 'custom-wallet'
  name = 'Custom Symbol Wallet'
  // ... 実装
  
  generateUri(request: PaymentRequest): string {
    // カスタムディープリンクスキーム
    return `customwallet://payment?recipient=${request.recipientAddress}&amount=${request.amount}`
  }
}

// プラグインマネージャーに登録
qrPluginManager.registerPlugin(new CustomWalletPlugin())
```

### UIコンポーネント

#### ウォレットカード
```tsx
<WalletCard
  wallet={wallet}
  pluginId={pluginId}
  isSelected={isSelected}
  onSelect={onSelect}
/>
```

**表示情報**
- ウォレット名・アイコン
- 対応デバイス種別（モバイル/デスクトップ等）
- 利用可能性ステータス
- ダウンロードリンク（未インストール時）

#### 決済QR表示
```tsx
<PaymentQRDisplay
  paymentData={paymentData}
  onWalletChange={onWalletChange}
  defaultWalletId={defaultWalletId}
/>
```

**表示要素**
- ウォレット選択セクション
- QRコード画像
- URIコピー・ウォレット起動ボタン
- 決済情報詳細
- 使用方法ガイド

### ファイル構成

```
src/
├── lib/symbol/plugins/
│   ├── types.ts                     # プラグイン型定義
│   ├── manager.ts                   # プラグインマネージャー
│   ├── symbol-plugins.ts            # Symbol用プラグイン実装
│   └── index.ts                     # エクスポート
├── components/
│   ├── WalletSelector.tsx           # ウォレット選択UI
│   └── PaymentQRDisplay.tsx         # QR表示統合コンポーネント
└── public/icons/wallets/
    ├── symbol-mobile.svg            # モバイルウォレットアイコン
    ├── symbol-desktop.svg           # デスクトップウォレットアイコン
    └── symbol-standard.svg          # 標準QRアイコン
```

### 利用方法

#### 開発者向け
```typescript
// プラグインマネージャーの利用
import { qrPluginManager } from '@/lib/symbol/plugins'

// 利用可能なウォレット一覧取得
const wallets = qrPluginManager.getAvailableWallets()

// 特定ウォレットでQRコード生成
const result = await qrPluginManager.generateQRCode('symbol-mobile', paymentRequest)

// デフォルトウォレットでQRコード生成
const result = await qrPluginManager.generateDefaultQRCode(paymentRequest)
```

#### ユーザー体験
1. **決済ページアクセス**: ウォレット選択UIが自動表示
2. **ウォレット選択**: カード型UIから使用ウォレットを選択
3. **QRコード更新**: 選択に応じてQRコードが即座に更新
4. **決済実行**: QRスキャンまたは「ウォレットで開く」で決済実行

### 拡張性

このプラグインシステムにより、将来的に以下の拡張が容易に実現できます：

- **新ウォレット対応**: 新しいSymbolウォレットの簡単追加
- **QRフォーマット拡張**: ウォレット固有のQRコード仕様対応
- **設定UI**: プラグインごとの詳細設定画面
- **A/Bテスト**: 複数QRコード仕様の効果測定
- **統計機能**: ウォレット別利用統計の収集

### 📊 統計・分析機能

XYMPayは取引履歴の詳細な統計情報を提供し、売上分析や成長率の把握が可能です。

#### 統計情報の種類

- **総売上**: 期間内の売上合計（XYM）
- **取引数**: 完了した取引件数
- **平均取引額**: 1取引あたりの平均金額
- **成長率**: 前期間比の売上・取引数増減率
- **法定通貨換算**: JPY換算額（レート適用時）

#### 期間切り替え機能

- **今日**: 本日の統計
- **今週**: 過去7日間
- **今月**: 過去30日間  
- **3ヶ月**: 過去90日間
- **年間**: 過去365日間
- **全期間**: 全データ

#### 統計データの表示

```typescript
// TransactionStatsコンポーネント
<TransactionStats className="mb-8" />

// 統計API
GET /api/transactions/stats?period=month
```

#### 実装詳細

**統計API仕様**
```typescript
interface StatsResponse {
  totalAmount: number        // 総売上（マイクロXYM）
  transactionCount: number   // 取引数
  averageAmount: number      // 平均取引額
  baseCurrencyAmount?: number // 法定通貨換算額
  baseCurrency?: string      // 基準通貨（JPY等）
  growth?: {                 // 成長率データ
    amount: number           // 売上増減額
    count: number            // 取引数増減
    percentage: number       // 成長率（%）
  }
}
```

**フロントエンド機能**
```typescript
// 期間切り替えによるリアルタイム更新
const [selectedPeriod, setSelectedPeriod] = useState('month')

useEffect(() => {
  fetchStats(selectedPeriod)
}, [selectedPeriod])
```

#### 統計機能のテスト

```bash
# 統計機能の動作確認
bash test-scripts/frontend-tests/test-transaction-stats.sh

# フロントエンドでの確認
# 1. http://localhost:3000/transactions を開く
# 2. 上部の統計情報セクションで期間タブを切り替える
# 3. リアルタイムで統計データが更新されることを確認
```

#### 期間連動機能

統計情報と取引履歴の期間フィルターが双方向で連動し、シームレスなデータ分析体験を提供します。

**連動動作**
```typescript
// 統計期間変更 → 取引履歴フィルター自動更新
const handleStatsPeriodChange = (statsPeriod: string) => {
  const filterPeriod = mapStatsPeriodToFilterPeriod(statsPeriod)
  setFilters(prev => ({ ...prev, period: filterPeriod }))
}

// 取引履歴フィルター変更 → 統計期間自動更新  
const handleFilterChange = (key: string, value: string) => {
  if (key === 'period') {
    const newStatsPeriod = statsMapping[value] || 'month'
    setStatsSelectedPeriod(newStatsPeriod)
  }
}
```

**期間マッピング**
- 統計「今日」↔ 履歴「今日」
- 統計「今週」↔ 履歴「今週」
- 統計「今月」↔ 履歴「今月」
- 統計「3ヶ月」↔ 履歴「過去3ヶ月」
- 統計「年間」→ 履歴「今月」（詳細表示用）
- 統計「全期間」↔ 履歴「すべて」

#### 今月フィルター修正（パラメータ送信問題）

**問題**: APIパラメータの不適切な処理により期間フィルターが無効化

**原因分析**:
```typescript
// 修正前: 空文字列("")を送信
const params = new URLSearchParams({
  period: filters.period === "all" ? "" : filters.period,
})

// API側のチェック不十分
if (period && period !== 'all') // 空文字列("")はtruthyなのでtrue
```

**修正内容**:
1. **useTransactions.ts**: 条件付きパラメータ追加
```typescript
// 修正後: 必要な場合のみパラメータ追加
if (filters.period !== "all") {
  params.append('period', filters.period)
}
```

2. **API route.ts**: 空文字列チェック追加
```typescript
// 修正後: 空文字列も除外
if (period && period !== 'all' && period !== '') {
```

3. **デバッグログ強化**: フィルター適用状況の詳細ログ

**検証**: ブラウザコンソール + サーバーログでフィルター適用確認
````markdown
#### 今月フィルター最終修正（未来データ問題）

**根本原因**: デモデータの`createdAt`が未来の日付に設定されていた

**問題のデータ**:
```
DEMO_PAST_0009: 2025/12/18 (12月) ← 未来
DEMO_PAST_0005: 2025/12/5  (12月) ← 未来  
DEMO_PAST_0008: 2025/11/23 (11月) ← 未来
DEMO_PAST_0002: 2025/10/27 (10月) ← 未来
DEMO_PAST_0006: 2025/8/3   (8月)  ← 未来
```

**修正前のフィルター問題**:
```typescript
where.createdAt = { gte: thisMonthStart } // 7月以降すべて（未来も含む）
```

**修正後の正確なフィルター**:
```typescript
// 今月のみ（7/1 00:00:00 〜 7/31 23:59:59）
where.createdAt = { 
  gte: thisMonthStart,    // 2025-07-01T00:00:00
  lte: thisMonthEnd       // 2025-07-31T23:59:59
}
```

**デモデータ修正スクリプト**:
```bash
node test-scripts/debug-tools/fix-demo-data-dates.mjs
```

**検証結果**: 12月・11月・10月・8月のデモデータが非表示になり、7月のデータのみ表示
````

### 今週フィルター修正（未来データ＋ロジック改善）

**問題**: 「今週」フィルターで未来のデータが表示され、フィルターロジックが一般的でない

**修正内容**:
1. **未来デモデータの修正**: 5件の未来日付データを過去に変更
   ```
   2025/12/18 → 2025/6/18, 2025/12/5 → 2025/6/5
   2025/11/23 → 2025/5/23, 2025/10/27 → 2025/4/27
   2025/8/3 → 2025/6/3
   ```

2. **「今週」ロジック改善**:
   ```typescript
   // 修正前: 過去7日間（直感的でない）
   weekAgo.setDate(today.getDate() - 7)
   
   // 修正後: 今週の月曜日〜日曜日（一般的）
   const dayOfWeek = today.getDay()
   const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
   thisWeekStart.setDate(today.getDate() - daysFromMonday)
   ```

3. **両API統一**: `transactions/route.ts` + `transactions/stats/route.ts`

**検証結果**: 2025/7/20（日）基準で7/14（月）〜7/20（日）の20件を正確取得

#### 取引履歴ページに売上推移グラフ追加

**改善内容**: ホームページの売上推移グラフを取引履歴ページにも追加

**実装詳細**:
1. **SalesChartコンポーネントの統合**:
   ```tsx
   // dynamic importでSSR問題を回避
   const SalesChart = dynamic(
     () => import("../../components/SalesChart"),
     { ssr: false, loading: () => <div>Loading...</div> }
   )
   ```

2. **UI配置**: 統計情報 → 売上推移グラフ → フィルター → 取引履歴テーブル

3. **機能**:
   - 日別・月別・年別の売上推移切り替え
   - 既存API (`/api/dashboard/chart`) を活用
   - インタラクティブなツールチップ表示

**効果**: データの可視化による売上トレンド把握の向上、統計数値とグラフの両方でのデータ確認

## 会計ソフト同期

会計ソフト連携機能により、決済データを自動的に会計ソフトに取り込むことができます。

#### 対応会計ソフト

- **freee**: OAuth認証による自動同期
- **マネーフォワード**: OAuth認証による自動同期（開発中）
- **弥生**: OAuth認証による自動同期（開発中）
- **CSV出力**: 汎用的なCSV/Excel形式でのエクスポート

#### 機能

- 取引データの自動同期（手動・スケジュール実行）
- OAuth認証による安全な連携
- 税率・勘定科目の設定
- 同期履歴の管理とエラー追跡
- 複数アカウント対応
- データフィルタリング（期間・ステータス・金額）

#### セットアップ

1. **OAuth認証情報の設定**
```bash
# .envファイルに追加
FREEE_CLIENT_ID=your_freee_client_id
FREEE_CLIENT_SECRET=your_freee_client_secret
FREEE_REDIRECT_URI=http://localhost:3000/api/accounting/oauth/callback
```

2. **会計設定の追加**
- ダッシュボードから「会計ソフト連携」にアクセス
- 使用する会計ソフトを選択・設定
- OAuth認証を実行（freeeの場合）

3. **同期の実行**
- 手動同期: 設定画面から即座に実行
- 自動同期: 設定した頻度で自動実行
- CSV出力: 任意の期間でエクスポート

#### API エンドポイント

```bash
# 設定管理
GET    /api/accounting/settings      # 設定一覧
POST   /api/accounting/settings      # 設定作成
PUT    /api/accounting/settings/:id  # 設定更新
DELETE /api/accounting/settings/:id  # 設定削除

# OAuth認証
GET    /api/accounting/oauth/start   # 認証開始
GET    /api/accounting/oauth/callback # 認証完了

# 同期・エクスポート
POST   /api/accounting/sync          # 手動同期実行
GET    /api/accounting/sync          # 同期履歴取得
POST   /api/accounting/export        # CSV/Excelエクスポート
```

#### テスト

```bash
# 会計同期機能のテスト
node test-scripts/accounting-tests/test-accounting-sync.mjs
```
