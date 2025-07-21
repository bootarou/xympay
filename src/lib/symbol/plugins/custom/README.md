# XYMPay カスタムウォレットプラグイン サンプル

このフォルダには、XYMPayプロジェクト用のカスタムウォレットプラグインのサンプル実装が含まれています。

## 📁 フォルダ構成

```
src/lib/symbol/plugins/custom/
├── my-wallet-plugin.ts           # 基本的なカスタムプラグイン
├── my-wallet-config.tsx          # 設定UI コンポーネント
├── advanced-wallet-plugin.ts     # 高度な機能を持つプラグイン
├── test-wallet-plugin.ts         # テスト・デバッグ用プラグイン
├── index.ts                      # プラグインのエクスポート管理
├── __tests__/
│   └── custom-plugins.test.ts    # テストファイル
└── README.md                     # このファイル
```

## 🚀 含まれているプラグイン

### 1. My Wallet Plugin (`my-wallet-plugin.ts`)
**基本的なカスタムウォレットプラグイン**
- ✅ QRコード生成
- ✅ ディープリンクURI生成
- ✅ 入力パラメータ検証
- ✅ 健康状態チェック
- ✅ 設定UI対応

**特徴:**
- シンプルで理解しやすい実装
- カスタムブランドカラー (#2E7D32)
- 基本的なエラーハンドリング
- 詳細なログ出力

### 2. Advanced Wallet Plugin (`advanced-wallet-plugin.ts`)
**高度な機能を持つプラグイン**
- ✅ 複数のURIスキーム対応
- ✅ カスタム暗号化機能
- ✅ エラーリトライ機能
- ✅ 外部API連携
- ✅ 詳細な統計情報
- ✅ パフォーマンス監視

**特徴:**
- 商用レベルの機能
- 高度なエラー処理
- API呼び出しのリトライ
- データの暗号化
- 統計情報の収集

### 3. Test Wallet Plugin (`test-wallet-plugin.ts`)
**テスト・デバッグ専用プラグイン**
- ✅ 詳細なログ出力
- ✅ 意図的なエラー生成
- ✅ パフォーマンス測定
- ✅ ダミーデータ生成
- ✅ デバッグモード

**特徴:**
- 開発時のデバッグに特化
- 実行時間の測定
- ステップバイステップのログ
- エラーシミュレーション

## ⚙️ 設定コンポーネント

### My Wallet Config (`my-wallet-config.tsx`)
Reactベースの設定UIコンポーネント

**設定可能項目:**
- QRコードサイズ (128-512px)
- QRコード色 (カラーピッカー)
- 背景色
- 通知設定
- カスタムスキーム
- デバッグモード

## 🎨 アイコンファイル

各プラグイン用のSVGアイコンが `public/icons/wallets/` に配置されています：
- `my-wallet.svg` - 基本プラグイン用
- `advanced-wallet.svg` - 高度プラグイン用  
- `test-wallet.svg` - テストプラグイン用

## 🧪 テスト

### テストファイル: `__tests__/custom-plugins.test.ts`

以下の項目をテストしています：
- プラグインの基本プロパティ
- `canHandle` メソッドの動作
- URI生成機能
- QRコード生成機能
- エラーハンドリング
- 健康状態チェック
- 統合テスト

### テスト実行方法

```bash
# 全テスト実行
npm test

# カスタムプラグインのみ
npm test custom-plugins.test.ts
```

## 📋 使用方法

### 1. プラグインの有効化

管理画面 (`/admin/plugins`) でプラグインを有効化できます。

### 2. プログラムでの使用

```typescript
import { qrPluginManager } from 'src/lib/symbol/plugins';

// プラグインを取得
const myWalletPlugin = qrPluginManager.getPlugin('my-wallet');

// QRコード生成
const paymentRequest = {
  recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
  amount: 1000000,
  paymentId: 'PAY1234',
  message: 'Test payment'
};

const qrCode = await myWalletPlugin.generateQR(paymentRequest);
const uri = myWalletPlugin.generateUri(paymentRequest);
```

### 3. デモページでの確認

`/demo/plugins` で実際の動作を確認できます。

## 🔧 カスタマイズ

### 新しいプラグインの作成

1. **プラグインクラス作成:**
```typescript
export class YourWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'your-wallet';
  readonly name = 'Your Wallet Plugin';
  // ...実装
}
```

2. **index.tsに追加:**
```typescript
export { YourWalletPlugin } from './your-wallet-plugin';
```

3. **アイコン追加:**
```
public/icons/wallets/your-wallet.svg
```

### 設定コンポーネントの作成

```typescript
export function YourWalletConfig({ settings, onSettingsChange }) {
  // 設定UI の実装
}
```

## 🐛 デバッグ

### ログ出力
全プラグインで詳細なログが出力されます：

```javascript
// ブラウザのコンソールで確認
console.log('Available plugins:', qrPluginManager.getAllPlugins());
```

### Health Check
プラグインの健康状態確認：

```typescript
const result = await qrPluginManager.testPlugin('my-wallet');
console.log('Health check:', result);
```

## 📚 参考資料

- [ウォレットプラグイン開発ガイド](../../../docs/WALLET_PLUGIN_DEVELOPMENT.md)
- [型定義](../types.ts)
- [プラグインマネージャー](../manager.ts)
- [標準プラグイン実装](../symbol-plugins.ts)

## 🚨 注意事項

1. **Test Wallet Plugin** は開発環境でのみ使用してください
2. 本番環境では適切なエラーハンドリングと検証を実装してください
3. カスタムプラグインは十分にテストしてから使用してください
4. セキュリティ要件に応じて暗号化機能を実装してください

## 📄 ライセンス

このサンプルコードはMITライセンスの下で提供されています。

---

**Happy Coding! 🎉**

詳細な開発ガイドは [WALLET_PLUGIN_DEVELOPMENT.md](../../../docs/WALLET_PLUGIN_DEVELOPMENT.md) をご参照ください。
