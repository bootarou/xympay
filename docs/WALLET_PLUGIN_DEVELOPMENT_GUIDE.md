# ウォレットプラグイン開発ガイド

## 概要

XYMPayでは、異なるSymbolウォレット間での互換性を確保するため、プラグインアーキテクチャを採用しています。このガイドでは、新しいウォレット対応プラグインの開発方法について説明します。

## 目次

1. [プラグインアーキテクチャ](#プラグインアーキテクチャ)
2. [開発環境のセットアップ](#開発環境のセットアップ)
3. [プラグインの作成](#プラグインの作成)
4. [QRコード生成の実装](#qrコード生成の実装)
5. [アイコンとUIの準備](#アイコンとuiの準備)
6. [テストとデバッグ](#テストとデバッグ)
7. [プラグインの登録](#プラグインの登録)
8. [ベストプラクティス](#ベストプラクティス)

## プラグインアーキテクチャ

### 基本構造

```
src/lib/symbol/plugins/
├── types.ts           # プラグインの型定義
├── manager.ts         # プラグインマネージャー
├── symbol-plugins.ts  # 標準プラグイン実装
└── index.ts          # エクスポート管理
```

### 型定義

プラグインは以下のインターフェースを実装する必要があります：

```typescript
export interface QRGeneratorPlugin {
  // プラグインの基本情報
  id: string;                    // 一意のプラグインID
  name: string;                  // 表示名
  description: string;           // 説明文
  icon: string;                  // アイコンパス
  version: string;               // バージョン
  
  // 生成オプション
  generateQRCode: (params: QRGenerationParams) => Promise<QRCodeResult>;
  
  // UIカスタマイズ（オプション）
  customInstructions?: string;   // カスタム説明文
  supportedFeatures?: string[];  // サポート機能一覧
}
```

## 開発環境のセットアップ

### 必要な依存関係

```bash
npm install qrcode
npm install symbol-sdk
npm install @types/qrcode
```

### TypeScript設定

プロジェクトのTypeScript設定を確認し、以下の設定が有効になっていることを確認してください：

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## プラグインの作成

### 1. 基本プラグインクラスの作成

新しいプラグインファイルを作成します：

```typescript
// src/lib/symbol/plugins/my-wallet-plugin.ts
import { QRGeneratorPlugin, QRGenerationParams, QRCodeResult } from './types';
import QRCode from 'qrcode';

export class MyWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'my-wallet';
  readonly name = 'My Wallet';
  readonly description = 'My Wallet用のQRコード生成プラグイン';
  readonly icon = '/icons/wallets/my-wallet.svg';
  readonly version = '1.0.0';
  
  // カスタム説明文（オプション）
  readonly customInstructions = 'My Walletアプリでスキャンしてください';
  
  // サポート機能（オプション）
  readonly supportedFeatures = ['mobile', 'desktop'];

  async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult> {
    try {
      // ウォレット固有のURI形式を生成
      const uri = this.buildWalletURI(params);
      
      // QRコードを生成
      const qrCodeDataURL = await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        success: true,
        qrCodeDataURL,
        uri,
        instructions: this.customInstructions
      };
    } catch (error) {
      return {
        success: false,
        error: `QRコード生成に失敗しました: ${error.message}`
      };
    }
  }

  private buildWalletURI(params: QRGenerationParams): string {
    // ウォレット固有のURI形式を実装
    const baseURI = 'mywallet://pay';
    const queryParams = new URLSearchParams({
      recipient: params.recipientAddress,
      amount: params.amount.toString(),
      message: params.message || '',
      paymentId: params.paymentId
    });
    
    return `${baseURI}?${queryParams.toString()}`;
  }
}
```

### 2. プラグインの登録

作成したプラグインをシステムに登録します：

```typescript
// src/lib/symbol/plugins/symbol-plugins.ts に追加
import { MyWalletPlugin } from './my-wallet-plugin';

// プラグインインスタンスを作成
export const myWalletPlugin = new MyWalletPlugin();

// 利用可能プラグイン一覧に追加
export const availablePlugins: QRGeneratorPlugin[] = [
  symbolMobilePlugin,
  symbolStandardPlugin,
  symbolDesktopPlugin,
  myWalletPlugin, // 新しいプラグインを追加
];
```

## QRコード生成の実装

### URI形式の設計

各ウォレットは独自のURI形式を持つ場合があります。一般的なパターン：

```typescript
// 標準的なSymbol URI
'web+symbol://transaction?data=...'

// カスタムスキーム
'mywallet://pay?recipient=...&amount=...'

// HTTP/HTTPSベース
'https://mywallet.com/pay?recipient=...&amount=...'
```

### エラーハンドリング

```typescript
async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult> {
  try {
    // パラメータ検証
    if (!params.recipientAddress) {
      throw new Error('受信者アドレスが指定されていません');
    }
    
    if (params.amount <= 0) {
      throw new Error('金額は0より大きい値を指定してください');
    }
    
    // QRコード生成処理
    // ...
    
  } catch (error) {
    console.error(`[${this.id}] QRコード生成エラー:`, error);
    
    return {
      success: false,
      error: `QRコード生成に失敗しました: ${error.message}`
    };
  }
}
```

### QRコードオプションのカスタマイズ

```typescript
const qrOptions = {
  width: 256,
  height: 256,
  margin: 2,
  color: {
    dark: '#000000',    // プラグイン固有の色
    light: '#FFFFFF'
  },
  errorCorrectionLevel: 'M' as const
};

const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
```

## アイコンとUIの準備

### アイコンファイルの配置

1. SVGアイコンを準備（推奨サイズ: 24x24px、48x48px）
2. `public/icons/wallets/` ディレクトリに配置
3. プラグインでパスを指定

```typescript
// アイコンパスの例
readonly icon = '/icons/wallets/my-wallet.svg';
```

### アイコンのデザインガイドライン

- **形式**: SVG（推奨）またはPNG
- **サイズ**: 24x24px、48x48px
- **色**: モノクロまたはブランドカラー
- **背景**: 透明
- **スタイル**: シンプルで視認性の高いデザイン

## テストとデバッグ

### 単体テスト

```typescript
// tests/plugins/my-wallet-plugin.test.ts
import { MyWalletPlugin } from '../../src/lib/symbol/plugins/my-wallet-plugin';

describe('MyWalletPlugin', () => {
  let plugin: MyWalletPlugin;

  beforeEach(() => {
    plugin = new MyWalletPlugin();
  });

  test('プラグイン基本情報が正しく設定されている', () => {
    expect(plugin.id).toBe('my-wallet');
    expect(plugin.name).toBe('My Wallet');
    expect(plugin.version).toBe('1.0.0');
  });

  test('QRコードが正常に生成される', async () => {
    const params = {
      recipientAddress: 'NBLYH-ZQHCB-4L2ZE-6BSGH-5TVID-45ZCD-H4CT',
      amount: 100,
      message: 'テスト決済',
      paymentId: 'ABCD1234'
    };

    const result = await plugin.generateQRCode(params);
    
    expect(result.success).toBe(true);
    expect(result.qrCodeDataURL).toContain('data:image/png;base64,');
    expect(result.uri).toContain('mywallet://pay');
  });
});
```

### プラグイン管理画面でのテスト

1. 開発サーバーを起動: `npm run dev`
2. プラグイン管理画面にアクセス: `http://localhost:3000/admin/plugins`
3. プラグインの「テスト実行」ボタンをクリック
4. QRコードが正常に生成されることを確認

### デバッグ情報の活用

プラグイン管理画面の「デバッグ情報表示」を使用して、プラグインの状態を確認できます：

```typescript
// デバッグ情報の例
{
  "pluginId": "my-wallet",
  "enabled": true,
  "isDefault": false,
  "testResult": {
    "success": true,
    "generatedAt": "2024-12-19T10:30:00Z"
  }
}
```

## プラグインの登録

### 動的インポート（推奨）

```typescript
// src/lib/symbol/plugins/index.ts
export async function loadAllPlugins(): Promise<QRGeneratorPlugin[]> {
  const plugins: QRGeneratorPlugin[] = [];
  
  try {
    // 標準プラグイン
    const { availablePlugins } = await import('./symbol-plugins');
    plugins.push(...availablePlugins);
    
    // カスタムプラグイン（条件付き読み込み）
    if (process.env.ENABLE_CUSTOM_PLUGINS === 'true') {
      const { myWalletPlugin } = await import('./my-wallet-plugin');
      plugins.push(myWalletPlugin);
    }
    
  } catch (error) {
    console.error('プラグインの読み込みに失敗しました:', error);
  }
  
  return plugins;
}
```

### 環境変数での制御

```bash
# .env.local
ENABLE_CUSTOM_PLUGINS=true
MY_WALLET_API_KEY=your_api_key_here
```

## ベストプラクティス

### 1. エラーハンドリング

- すべての非同期処理でtry-catchを使用
- ユーザーフレンドリーなエラーメッセージを提供
- ログ出力でデバッグ情報を記録

### 2. パフォーマンス

- QRコード生成は非同期で実行
- 大きな画像やデータの処理時はプログレス表示を検討
- メモリリークを避けるため、不要なオブジェクトは適切に解放

### 3. セキュリティ

- 機密情報（秘密鍵など）は絶対にQRコードに含めない
- ユーザー入力は常に検証・サニタイズ
- HTTPS通信を前提とした実装

### 4. 国際化対応

```typescript
// 多言語対応の例
readonly name = {
  en: 'My Wallet',
  ja: 'マイウォレット'
};

readonly description = {
  en: 'QR code generator for My Wallet',
  ja: 'My Wallet用のQRコード生成プラグイン'
};
```

### 5. バージョン管理

- セマンティックバージョニングを使用（例: 1.0.0）
- 破壊的変更時はメジャーバージョンを更新
- CHANGELOG.mdでバージョン履歴を管理

### 6. ドキュメント

- プラグインの機能と制限を明確に記述
- サンプルコードとユースケースを提供
- APIの変更点と移行ガイドを含める

## サンプルコード集

### シンプルなプラグイン

```typescript
export class SimpleWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'simple-wallet';
  readonly name = 'Simple Wallet';
  readonly description = 'シンプルなウォレット用プラグイン';
  readonly icon = '/icons/wallets/simple.svg';
  readonly version = '1.0.0';

  async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult> {
    const uri = `simple://pay?to=${params.recipientAddress}&amount=${params.amount}`;
    const qrCodeDataURL = await QRCode.toDataURL(uri);
    
    return {
      success: true,
      qrCodeDataURL,
      uri
    };
  }
}
```

### 高度な設定オプション付きプラグイン

```typescript
export class AdvancedWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'advanced-wallet';
  readonly name = 'Advanced Wallet';
  readonly description = '高度な設定オプション付きウォレット';
  readonly icon = '/icons/wallets/advanced.svg';
  readonly version = '2.0.0';
  readonly supportedFeatures = ['mobile', 'desktop', 'hardware'];

  constructor(private config: AdvancedWalletConfig = {}) {}

  async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult> {
    // 設定に基づくカスタマイズ
    const customParams = this.applyCustomSettings(params);
    
    // 複数フォーマット対応
    const uri = this.buildURI(customParams);
    const qrOptions = this.getQROptions();
    
    const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
    
    return {
      success: true,
      qrCodeDataURL,
      uri,
      instructions: this.getInstructions(customParams)
    };
  }

  private applyCustomSettings(params: QRGenerationParams) {
    return {
      ...params,
      // カスタム設定を適用
      priority: this.config.priority || 'normal',
      timeout: this.config.timeout || 30000
    };
  }

  private buildURI(params: any): string {
    // 高度なURI構築ロジック
    // ...
  }

  private getQROptions() {
    return {
      width: this.config.qrSize || 256,
      color: {
        dark: this.config.darkColor || '#000000',
        light: this.config.lightColor || '#FFFFFF'
      }
    };
  }

  private getInstructions(params: any): string {
    // 動的な説明文生成
    return `Advanced Walletで${params.amount} XYMを送金してください`;
  }
}
```

## トラブルシューティング

### よくある問題と解決方法

1. **QRコードが生成されない**
   - URI形式が正しいか確認
   - 必須パラメータが全て設定されているか確認
   - qrcode ライブラリが正しくインストールされているか確認

2. **プラグインが読み込まれない**
   - プラグインクラスが正しくエクスポートされているか確認
   - availablePlugins配列に追加されているか確認
   - TypeScriptコンパイルエラーがないか確認

3. **アイコンが表示されない**
   - アイコンファイルのパスが正しいか確認
   - ファイルが存在し、アクセス可能か確認
   - SVGファイルの形式が正しいか確認

## 関連リソース

- [プラグインAPIリファレンス](./PLUGIN_API_REFERENCE.md)
- [サンプルプラグイン集](./PLUGIN_SAMPLES.md)
- [Symbol SDK ドキュメント](https://docs.symbolplatform.com/)
- [QRコードライブラリ](https://github.com/soldair/node-qrcode)

## サポート

プラグイン開発に関する質問やサポートが必要な場合は、以下のリソースをご利用ください：

- GitHub Issues
- 開発者フォーラム
- 技術ドキュメント

---

**注意**: このガイドは継続的に更新されます。最新の情報については、常に最新版のドキュメントを参照してください。
