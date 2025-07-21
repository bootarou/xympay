# XYMPay ウォレットプラグイン開発ガイド

## 📋 目次

1. [概要](#概要)
2. [プラグインアーキテクチャ](#プラグインアーキテクチャ)
3. [開発環境のセットアップ](#開発環境のセットアップ)
4. [基本的なプラグインの作成](#基本的なプラグインの作成)
5. [高度なプラグイン機能](#高度なプラグイン機能)
6. [テストとデバッグ](#テストとデバッグ)
7. [プラグインの登録と配布](#プラグインの登録と配布)
8. [ベストプラクティス](#ベストプラクティス)
9. [トラブルシューティング](#トラブルシューティング)

---

## 📖 概要

XYMPayのウォレットプラグインシステムは、さまざまなSymbolウォレットに対応したQRコード生成とディープリンク機能を提供します。開発者は独自のウォレットプラグインを作成して、新しいウォレットや独自の仕様に対応できます。

### 主な機能

- **QRコード生成**: ウォレット固有の仕様に基づくQRコード生成
- **ディープリンク**: ウォレットアプリへの直接リンク生成
- **柔軟な設定**: ウォレットごとの詳細設定とカスタマイズ
- **リアルタイム管理**: 管理画面からの有効/無効切り替え
- **テスト機能**: プラグインの動作確認とデバッグ

---

## 🏗️ プラグインアーキテクチャ

### コアコンポーネント

```
src/lib/symbol/plugins/
├── types.ts           # 型定義
├── manager.ts         # プラグインマネージャー
├── symbol-plugins.ts  # 標準プラグイン実装
└── index.ts          # エクスポートとデフォルト設定
```

### 主要インターフェース

```typescript
// QRGeneratorPlugin: プラグインの基本インターフェース
interface QRGeneratorPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  wallet: WalletInfo;
  
  canHandle(request: PaymentRequest): boolean;
  generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string>;
  generateUri(request: PaymentRequest): string;
  getConfigComponent?(): React.ComponentType<any>;
}
```

---

## 🛠️ 開発環境のセットアップ

### 1. 必要な依存関係

```bash
npm install qrcode
npm install @types/qrcode --save-dev
```

### 2. 型定義ファイルの確認

`src/lib/symbol/plugins/types.ts`の内容を確認し、必要に応じて拡張します。

```typescript
export interface PaymentRequest {
  recipientAddress: string;
  amount: number | string;
  paymentId: string;
  currency?: string;
  message?: string;
}

export interface WalletInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  type: 'mobile' | 'desktop' | 'web' | 'hardware';
  supported: boolean;
  downloadUrl?: string;
  deepLinkScheme?: string;
}
```

### 3. 開発用フォルダ構成

```
src/lib/symbol/plugins/
├── custom/
│   ├── my-wallet-plugin.ts    # カスタムプラグイン
│   ├── my-wallet-config.tsx   # 設定コンポーネント
│   └── index.ts              # カスタムプラグインエクスポート
```

---

## 🚀 基本的なプラグインの作成

### Step 1: プラグインクラスの作成

```typescript
// src/lib/symbol/plugins/custom/my-wallet-plugin.ts
import QRCode from 'qrcode';
import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';

export class MyWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'my-wallet';
  readonly name = 'My Wallet Plugin';
  readonly version = '1.0.0';
  readonly description = 'カスタムウォレット用QRコード生成プラグイン';

  readonly wallet: WalletInfo = {
    id: 'my-wallet',
    name: 'MyWallet',
    displayName: 'My Custom Wallet',
    description: 'カスタム開発されたSymbolウォレット',
    icon: '/icons/wallets/my-wallet.svg',
    type: 'mobile',
    supported: true,
    downloadUrl: 'https://example.com/my-wallet',
    deepLinkScheme: 'mywallet://'
  };

  /**
   * このプラグインがリクエストを処理できるかチェック
   */
  canHandle(request: PaymentRequest): boolean {
    // 基本的な validation
    return !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );
  }

  /**
   * QRコードを生成
   */
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    try {
      // URI を生成
      const uri = this.generateUri(request);
      
      // QRコード生成オプション
      const qrOptions = {
        width: options?.width || 256,
        height: options?.height || 256,
        margin: options?.margin || 4,
        color: {
          dark: options?.color?.dark || '#000000',
          light: options?.color?.light || '#FFFFFF'
        }
      };

      // QRコードを生成
      const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
      return qrCodeDataURL;

    } catch (error) {
      throw new Error(`QRコード生成エラー: ${error.message}`);
    }
  }

  /**
   * ディープリンクURIを生成
   */
  generateUri(request: PaymentRequest): string {
    // カスタムウォレット用のURI形式
    const params = new URLSearchParams({
      address: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.message || request.paymentId,
      payment_id: request.paymentId
    });

    return `${this.wallet.deepLinkScheme}pay?${params.toString()}`;
  }

  /**
   * 設定画面用コンポーネント（オプション）
   */
  getConfigComponent() {
    return MyWalletConfig; // 後で作成
  }
}
```

### Step 2: 設定コンポーネントの作成（オプション）

```typescript
// src/lib/symbol/plugins/custom/my-wallet-config.tsx
import React, { useState } from 'react';

interface MyWalletConfigProps {
  settings: any;
  onSettingsChange: (settings: any) => void;
}

export function MyWalletConfig({ settings, onSettingsChange }: MyWalletConfigProps) {
  const [qrSize, setQrSize] = useState(settings?.qrSize || 256);
  const [darkColor, setDarkColor] = useState(settings?.darkColor || '#000000');

  const handleSave = () => {
    onSettingsChange({
      qrSize,
      darkColor
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">My Wallet 設定</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          QRコードサイズ
        </label>
        <input
          type="number"
          value={qrSize}
          onChange={(e) => setQrSize(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2"
          min="128"
          max="512"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          QRコード色
        </label>
        <input
          type="color"
          value={darkColor}
          onChange={(e) => setDarkColor(e.target.value)}
          className="border border-gray-300 rounded-md"
        />
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        設定を保存
      </button>
    </div>
  );
}
```

### Step 3: プラグインの登録

```typescript
// src/lib/symbol/plugins/custom/index.ts
export { MyWalletPlugin } from './my-wallet-plugin';
export { MyWalletConfig } from './my-wallet-config';
```

```typescript
// src/lib/symbol/plugins/index.ts に追加
import { MyWalletPlugin } from './custom';

export function createDefaultPluginManager(): QRPluginManager {
  const manager = new QRPluginManager();

  // 標準プラグインを登録
  manager.registerPlugins([
    new SymbolMobilePlugin(),
    new SymbolDesktopPlugin(),
    new SymbolStandardPlugin(),
    new MyWalletPlugin() // カスタムプラグインを追加
  ]);

  return manager;
}
```

---

## 🔧 高度なプラグイン機能

### 1. 動的設定の実装

```typescript
export class AdvancedWalletPlugin implements QRGeneratorPlugin {
  // ...基本プロパティ...

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    // プラグインマネージャーから設定を取得
    const settings = this.getSettings();
    
    // 設定に基づいてQRコード生成をカスタマイズ
    const customOptions = {
      ...options,
      width: settings.qrSize || options?.width || 256,
      color: {
        dark: settings.darkColor || '#000000',
        light: settings.lightColor || '#FFFFFF'
      }
    };

    const uri = this.generateUri(request);
    return await QRCode.toDataURL(uri, customOptions);
  }

  private getSettings() {
    // プラグインマネージャーから設定を取得
    return qrPluginManager.getConfig().pluginSettings[this.id] || {};
  }
}
```

### 2. 非同期初期化

```typescript
export class AsyncWalletPlugin implements QRGeneratorPlugin {
  private initialized = false;
  private walletConfig: any = null;

  async initialize() {
    if (!this.initialized) {
      // 外部APIからウォレット情報を取得
      this.walletConfig = await fetch('/api/wallet-config').then(r => r.json());
      this.initialized = true;
    }
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    await this.initialize();
    // 初期化後の処理...
  }
}
```

### 3. エラーハンドリング

```typescript
export class RobustWalletPlugin implements QRGeneratorPlugin {
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    try {
      // バリデーション
      this.validateRequest(request);
      
      const uri = this.generateUri(request);
      return await QRCode.toDataURL(uri, options);
      
    } catch (error) {
      // ログ出力
      console.error(`[${this.id}] QRコード生成エラー:`, error);
      
      // ユーザーフレンドリーなエラーメッセージ
      if (error instanceof ValidationError) {
        throw new Error('入力データが不正です。');
      } else if (error instanceof NetworkError) {
        throw new Error('ネットワークエラーが発生しました。');
      } else {
        throw new Error('QRコードの生成に失敗しました。');
      }
    }
  }

  private validateRequest(request: PaymentRequest) {
    if (!request.recipientAddress || request.recipientAddress.length < 39) {
      throw new ValidationError('無効なアドレスです。');
    }
    
    if (!request.amount || Number(request.amount) <= 0) {
      throw new ValidationError('無効な金額です。');
    }
  }
}

class ValidationError extends Error {}
class NetworkError extends Error {}
```

---

## 🧪 テストとデバッグ

### 1. ユニットテスト

```typescript
// src/lib/symbol/plugins/custom/__tests__/my-wallet-plugin.test.ts
import { MyWalletPlugin } from '../my-wallet-plugin';

describe('MyWalletPlugin', () => {
  let plugin: MyWalletPlugin;

  beforeEach(() => {
    plugin = new MyWalletPlugin();
  });

  test('canHandle should return true for valid request', () => {
    const request = {
      recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
      amount: 100,
      paymentId: 'TEST1234'
    };

    expect(plugin.canHandle(request)).toBe(true);
  });

  test('generateUri should create valid URI', () => {
    const request = {
      recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
      amount: 100,
      paymentId: 'TEST1234',
      message: 'Test payment'
    };

    const uri = plugin.generateUri(request);
    expect(uri).toContain('mywallet://pay');
    expect(uri).toContain('address=TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY');
    expect(uri).toContain('amount=100');
  });

  test('generateQR should return data URL', async () => {
    const request = {
      recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
      amount: 100,
      paymentId: 'TEST1234'
    };

    const qrCode = await plugin.generateQR(request);
    expect(qrCode).toMatch(/^data:image\/png;base64,/);
  });
});
```

### 2. 統合テスト

```typescript
// プラグインマネージャーでのテスト
import { qrPluginManager } from '../index';

describe('Plugin Integration', () => {
  test('plugin should be registered and available', () => {
    const availableWallets = qrPluginManager.getAvailableWallets();
    const myWallet = availableWallets.find(w => w.pluginId === 'my-wallet');
    
    expect(myWallet).toBeDefined();
    expect(myWallet.wallet.displayName).toBe('My Custom Wallet');
  });

  test('plugin test functionality', async () => {
    const result = await qrPluginManager.testPlugin('my-wallet');
    expect(result.success).toBe(true);
  });
});
```

### 3. デバッグ用コンソール出力

```typescript
export class DebuggableWalletPlugin implements QRGeneratorPlugin {
  private debug = process.env.NODE_ENV === 'development';

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    if (this.debug) {
      console.log(`[${this.id}] QRコード生成開始:`, request);
      console.log(`[${this.id}] オプション:`, options);
    }

    const uri = this.generateUri(request);
    
    if (this.debug) {
      console.log(`[${this.id}] 生成URI:`, uri);
    }

    const qrCode = await QRCode.toDataURL(uri, options);
    
    if (this.debug) {
      console.log(`[${this.id}] QRコード生成完了:`, qrCode.substring(0, 50) + '...');
    }

    return qrCode;
  }
}
```

---

## 📦 プラグインの登録と配布

### 1. アイコンファイルの準備

```bash
# アイコンを配置
public/icons/wallets/my-wallet.svg
```

SVGアイコンの例：
```svg
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#4F46E5"/>
  <path d="M8 12h16v8H8z" fill="white"/>
  <circle cx="20" cy="16" r="1" fill="#4F46E5"/>
</svg>
```

### 2. 翻訳ファイルの更新

```json
// src/lib/i18n/ja.json
{
  "plugins": {
    "wallets": {
      "my-wallet": {
        "name": "My Custom Wallet",
        "description": "カスタム開発されたSymbolウォレット"
      }
    }
  }
}
```

### 3. TypeScript型定義の更新

```typescript
// 必要に応じて types.ts を拡張
export interface ExtendedWalletInfo extends WalletInfo {
  customSettings?: {
    apiEndpoint?: string;
    apiKey?: string;
    customFields?: Record<string, any>;
  };
}
```

---

## 💡 ベストプラクティス

### 1. プラグイン設計原則

- **単一責任**: 1つのプラグインは1つのウォレットのみをサポート
- **疎結合**: 他のプラグインや外部サービスに依存しない設計
- **エラー処理**: 適切なエラーハンドリングとユーザーフレンドリーなメッセージ
- **パフォーマンス**: 重い処理は非同期で実行

### 2. コーディング規約

```typescript
// ✅ 良い例
export class WellDesignedPlugin implements QRGeneratorPlugin {
  readonly id = 'well-designed';
  readonly name = 'Well Designed Plugin';
  readonly version = '1.0.0';
  
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    this.validateRequest(request);
    const uri = this.generateUri(request);
    return await this.createQRCode(uri, options);
  }
  
  private validateRequest(request: PaymentRequest): void {
    // バリデーション処理
  }
  
  private async createQRCode(uri: string, options?: QRCodeOptions): Promise<string> {
    // QRコード生成処理
  }
}

// ❌ 悪い例
export class PoorlyDesignedPlugin implements QRGeneratorPlugin {
  id = 'poorly-designed'; // readonlyを使用
  
  async generateQR(request: PaymentRequest): Promise<string> {
    // エラーハンドリングなし
    // バリデーションなし
    return QRCode.toDataURL(request.recipientAddress); // 不適切なURI
  }
}
```

### 3. セキュリティ考慮事項

```typescript
export class SecureWalletPlugin implements QRGeneratorPlugin {
  generateUri(request: PaymentRequest): string {
    // ✅ 入力値のサニタイズ
    const sanitizedAddress = this.sanitizeAddress(request.recipientAddress);
    const sanitizedAmount = this.sanitizeAmount(request.amount);
    const sanitizedMessage = this.sanitizeMessage(request.message);
    
    return `wallet://pay?address=${encodeURIComponent(sanitizedAddress)}&amount=${sanitizedAmount}`;
  }
  
  private sanitizeAddress(address: string): string {
    // アドレス形式の検証
    if (!/^[A-Z0-9]{39}$/.test(address)) {
      throw new Error('無効なアドレス形式です');
    }
    return address;
  }
  
  private sanitizeAmount(amount: number | string): string {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('無効な金額です');
    }
    return numAmount.toString();
  }
}
```

---

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. プラグインが登録されない

**症状**: プラグイン管理画面にプラグインが表示されない

**原因と解決方法**:
```typescript
// ❌ 問題のあるコード
export function createDefaultPluginManager(): QRPluginManager {
  const manager = new QRPluginManager();
  // プラグインを登録し忘れ
  return manager;
}

// ✅ 修正後
export function createDefaultPluginManager(): QRPluginManager {
  const manager = new QRPluginManager();
  
  manager.registerPlugins([
    new SymbolMobilePlugin(),
    new SymbolDesktopPlugin(),
    new SymbolStandardPlugin(),
    new MyWalletPlugin() // 追加
  ]);
  
  return manager;
}
```

#### 2. QRコード生成エラー

**症状**: `QRコード生成エラー: Cannot read property 'toDataURL' of undefined`

**解決方法**:
```typescript
// QRCodeライブラリの正しいインポート
import QRCode from 'qrcode';

// 非同期処理の適切な実装
async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
  try {
    const uri = this.generateUri(request);
    const qrCodeDataURL = await QRCode.toDataURL(uri, options);
    return qrCodeDataURL;
  } catch (error) {
    console.error('QRCode generation failed:', error);
    throw new Error(`QRコード生成エラー: ${error.message}`);
  }
}
```

#### 3. プラグイン設定が保存されない

**症状**: プラグインの有効/無効設定が保持されない

**解決方法**:
```typescript
// ローカルストレージ確認
console.log('Stored config:', localStorage.getItem('xympay_plugin_config'));

// 設定の手動保存
qrPluginManager.setPluginEnabled('my-wallet', true);

// デバッグ情報確認
qrPluginManager.debugConfig();
```

#### 4. TypeScriptエラー

**症状**: `Property 'id' does not exist on type`

**解決方法**:
```typescript
// インターフェースの正しい実装
export class MyWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'my-wallet';           // readonly を使用
  readonly name = 'My Wallet Plugin';  // readonly を使用
  readonly version = '1.0.0';          // readonly を使用
  
  // 必須メソッドの実装
  canHandle(request: PaymentRequest): boolean {
    return true;
  }
  
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    // 実装
  }
  
  generateUri(request: PaymentRequest): string {
    // 実装
  }
}
```

---

## 📚 参考リソース

### API リファレンス

- [QRGeneratorPlugin Interface](./src/lib/symbol/plugins/types.ts)
- [QRPluginManager Class](./src/lib/symbol/plugins/manager.ts)
- [標準プラグイン実装例](./src/lib/symbol/plugins/symbol-plugins.ts)

### 外部ライブラリ

- [qrcode](https://www.npmjs.com/package/qrcode) - QRコード生成ライブラリ
- [Symbol SDK](https://docs.symbolplatform.com/sdk/) - Symbol SDK ドキュメント

### サンプルプラグイン

- [Symbol Mobile Plugin](./src/lib/symbol/plugins/symbol-plugins.ts#L1)
- [Symbol Desktop Plugin](./src/lib/symbol/plugins/symbol-plugins.ts#L50)
- [Symbol Standard Plugin](./src/lib/symbol/plugins/symbol-plugins.ts#L100)

---

## 🔄 更新履歴

- **v1.0.0** (2025-06-27): 初版リリース
  - 基本的なプラグイン開発ガイド
  - サンプルコードとテスト方法
  - トラブルシューティングガイド

---

## 📞 サポート

プラグイン開発に関する質問やサポートが必要な場合は、以下の方法でお問い合わせください：

1. **GitHub Issues**: バグ報告や機能要求
2. **開発者向けドキュメント**: 最新の API リファレンス
3. **コミュニティフォーラム**: 開発者同士の情報交換

---

**Happy Coding! 🚀**
