# プラグインAPIリファレンス

## 概要

XYMPayウォレットプラグインシステムのAPIリファレンスドキュメントです。プラグイン開発に必要なインターフェース、型定義、メソッドの詳細について説明します。

## 目次

1. [型定義](#型定義)
2. [インターフェース](#インターフェース)
3. [プラグインマネージャー](#プラグインマネージャー)
4. [ユーティリティ関数](#ユーティリティ関数)
5. [イベントシステム](#イベントシステム)
6. [エラーハンドリング](#エラーハンドリング)

## 型定義

### QRGeneratorPlugin

ウォレットプラグインの基本インターフェースです。

```typescript
interface QRGeneratorPlugin {
  /** プラグインの一意識別子 */
  readonly id: string;
  
  /** プラグインの表示名 */
  readonly name: string;
  
  /** プラグインの説明文 */
  readonly description: string;
  
  /** アイコンファイルのパス */
  readonly icon: string;
  
  /** プラグインのバージョン */
  readonly version: string;
  
  /** QRコード生成メソッド */
  generateQRCode(params: QRGenerationParams): Promise<QRCodeResult>;
  
  /** カスタム説明文（オプション） */
  readonly customInstructions?: string;
  
  /** サポート機能一覧（オプション） */
  readonly supportedFeatures?: string[];
  
  /** プラグイン固有の設定（オプション） */
  readonly config?: PluginConfig;
}
```

### QRGenerationParams

QRコード生成に必要なパラメータです。

```typescript
interface QRGenerationParams {
  /** 受信者のSymbolアドレス */
  recipientAddress: string;
  
  /** 送金額（マイクロXYM単位） */
  amount: number;
  
  /** 決済メッセージ（オプション） */
  message?: string;
  
  /** 決済ID */
  paymentId: string;
  
  /** 追加メタデータ（オプション） */
  metadata?: Record<string, any>;
  
  /** 有効期限（オプション） */
  expiresAt?: Date;
  
  /** ネットワーク種別（オプション） */
  networkType?: NetworkType;
}
```

### QRCodeResult

QRコード生成の結果を表します。

```typescript
interface QRCodeResult {
  /** 生成成功フラグ */
  success: boolean;
  
  /** QRコードのData URL（成功時） */
  qrCodeDataURL?: string;
  
  /** 生成されたURI（成功時） */
  uri?: string;
  
  /** ユーザー向け説明文（オプション） */
  instructions?: string;
  
  /** エラーメッセージ（失敗時） */
  error?: string;
  
  /** 追加メタデータ（オプション） */
  metadata?: Record<string, any>;
}
```

### PluginConfig

プラグイン固有の設定項目です。

```typescript
interface PluginConfig {
  /** QRコードサイズ */
  qrSize?: number;
  
  /** QRコードの色設定 */
  colors?: {
    dark: string;
    light: string;
  };
  
  /** エラー訂正レベル */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  
  /** タイムアウト設定（ミリ秒） */
  timeout?: number;
  
  /** カスタム設定 */
  custom?: Record<string, any>;
}
```

### PluginState

プラグインの状態を表します。

```typescript
interface PluginState {
  /** プラグインID */
  pluginId: string;
  
  /** 有効/無効フラグ */
  enabled: boolean;
  
  /** デフォルトプラグインフラグ */
  isDefault: boolean;
  
  /** 最後のテスト結果 */
  lastTestResult?: TestResult;
  
  /** 設定項目 */
  config?: PluginConfig;
}
```

### TestResult

プラグインテストの結果です。

```typescript
interface TestResult {
  /** テスト成功フラグ */
  success: boolean;
  
  /** テスト実行時刻 */
  timestamp: Date;
  
  /** 実行時間（ミリ秒） */
  duration: number;
  
  /** エラーメッセージ（失敗時） */
  error?: string;
  
  /** 生成されたQRコードURL（成功時） */
  qrCodeDataURL?: string;
  
  /** 生成されたURI（成功時） */```

## インターフェース

### QRGeneratorPlugin

#### generateQRCode()

```typescript
async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult>
```

**概要**: 指定されたパラメータからQRコードを生成します。

**パラメータ**:
- `params`: QRコード生成パラメータ

**戻り値**: QRコード生成結果

**例**:
```typescript
const result = await plugin.generateQRCode({
  recipientAddress: 'NBLYH-ZQHCB-4L2ZE-6BSGH-5TVID-45ZCD-H4CT',
  amount: 1000000, // 1 XYM (マイクロXYM単位)
  message: 'テスト決済',
  paymentId: 'ABCD1234'
});

if (result.success) {
  console.log('QRコードURL:', result.qrCodeDataURL);
  console.log('URI:', result.uri);
} else {
  console.error('エラー:', result.error);
}
```

#### プロパティ

| プロパティ | 型 | 必須 | 説明 |
|-----------|---|-----|------|
| `id` | `string` | ✓ | プラグインの一意識別子 |
| `name` | `string` | ✓ | プラグインの表示名 |
| `description` | `string` | ✓ | プラグインの説明文 |
| `icon` | `string` | ✓ | アイコンファイルのパス |
| `version` | `string` | ✓ | プラグインのバージョン |
| `customInstructions` | `string` | - | カスタム説明文 |
| `supportedFeatures` | `string[]` | - | サポート機能一覧 |
| `config` | `PluginConfig` | - | プラグイン固有の設定 |

## プラグインマネージャー

### QRPluginManager

プラグインの管理とライフサイクルを制御するクラスです。

#### メソッド

##### registerPlugin()

```typescript
registerPlugin(plugin: QRGeneratorPlugin): void
```

プラグインを登録します。

**パラメータ**:
- `plugin`: 登録するプラグイン

**例**:
```typescript
const manager = QRPluginManager.getInstance();
manager.registerPlugin(new MyWalletPlugin());
```

##### getAvailablePlugins()

```typescript
getAvailablePlugins(): QRGeneratorPlugin[]
```

利用可能なプラグイン一覧を取得します。

**戻り値**: プラグイン配列

##### getEnabledPlugins()

```typescript
getEnabledPlugins(): QRGeneratorPlugin[]
```

有効なプラグイン一覧を取得します。

**戻り値**: 有効なプラグイン配列

##### getDefaultPlugin()

```typescript
getDefaultPlugin(): QRGeneratorPlugin | null
```

デフォルトプラグインを取得します。

**戻り値**: デフォルトプラグインまたはnull

##### setPluginEnabled()

```typescript
setPluginEnabled(pluginId: string, enabled: boolean): boolean
```

プラグインの有効/無効を設定します。

**パラメータ**:
- `pluginId`: プラグインID
- `enabled`: 有効/無効フラグ

**戻り値**: 設定成功フラグ

##### setDefaultPlugin()

```typescript
setDefaultPlugin(pluginId: string): boolean
```

デフォルトプラグインを設定します。

**パラメータ**:
- `pluginId`: プラグインID

**戻り値**: 設定成功フラグ

##### testPlugin()

```typescript
async testPlugin(pluginId: string): Promise<TestResult>
```

プラグインのテストを実行します。

**パラメータ**:
- `pluginId`: テストするプラグインID

**戻り値**: テスト結果

##### loadSettings()

```typescript
loadSettings(): PluginState[]
```

ローカルストレージから設定を読み込みます。

**戻り値**: プラグイン状態配列

##### saveSettings()

```typescript
saveSettings(): void
```

現在の設定をローカルストレージに保存します。

##### resetSettings()

```typescript
resetSettings(): void
```

すべての設定をリセットします。

##### getDebugInfo()

```typescript
getDebugInfo(): Record<string, any>
```

デバッグ情報を取得します。

**戻り値**: デバッグ情報オブジェクト

#### イベント

##### onPluginStateChanged

```typescript
addEventListener('pluginStateChanged', (event: CustomEvent<PluginStateChangeEvent>) => void): void
```

プラグイン状態変更時に発火されるイベントです。

**イベントデータ**:
```typescript
interface PluginStateChangeEvent {
  pluginId: string;
  previousState: PluginState;
  currentState: PluginState;
  changeType: 'enabled' | 'disabled' | 'default' | 'config';
}
```

**例**:
```typescript
manager.addEventListener('pluginStateChanged', (event) => {
  const { pluginId, changeType } = event.detail;
  console.log(`プラグイン ${pluginId} の状態が変更されました: ${changeType}`);
});
```

## ユーティリティ関数

### generateQRCode()

```typescript
async function generateQRCode(
  params: QRGenerationParams,
  pluginId?: string
): Promise<QRCodeResult>
```

指定されたプラグインまたはデフォルトプラグインでQRコードを生成します。

**パラメータ**:
- `params`: QRコード生成パラメータ
- `pluginId`: プラグインID（省略時はデフォルト）

**戻り値**: QRコード生成結果

### generateQRCodeForWallet()

```typescript
async function generateQRCodeForWallet(
  walletType: string,
  params: QRGenerationParams
): Promise<QRCodeResult>
```

特定のウォレット用のQRコードを生成します。

**パラメータ**:
- `walletType`: ウォレット種別
- `params`: QRコード生成パラメータ

**戻り値**: QRコード生成結果

### validatePluginId()

```typescript
function validatePluginId(pluginId: string): boolean
```

プラグインIDの形式を検証します。

**パラメータ**:
- `pluginId`: 検証するプラグインID

**戻り値**: 有効性フラグ

### formatAmount()

```typescript
function formatAmount(microXYM: number): string
```

マイクロXYM単位の金額を可読形式にフォーマットします。

**パラメータ**:
- `microXYM`: マイクロXYM単位の金額

**戻り値**: フォーマット済み文字列

**例**:
```typescript
formatAmount(1000000); // "1 XYM"
formatAmount(1500000); // "1.5 XYM"
```

## イベントシステム

### イベント一覧

| イベント名 | 説明 | データ |
|-----------|------|-------|
| `pluginStateChanged` | プラグイン状態変更 | `PluginStateChangeEvent` |
| `pluginRegistered` | プラグイン登録 | `PluginRegisteredEvent` |
| `pluginUnregistered` | プラグイン登録解除 | `PluginUnregisteredEvent` |
| `qrGenerated` | QRコード生成完了 | `QRGeneratedEvent` |
| `qrGenerationFailed` | QRコード生成失敗 | `QRGenerationFailedEvent` |

### イベントデータ型

#### PluginRegisteredEvent

```typescript
interface PluginRegisteredEvent {
  plugin: QRGeneratorPlugin;
  timestamp: Date;
}
```

#### PluginUnregisteredEvent

```typescript
interface PluginUnregisteredEvent {
  pluginId: string;
  timestamp: Date;
}
```

#### QRGeneratedEvent

```typescript
interface QRGeneratedEvent {
  pluginId: string;
  params: QRGenerationParams;
  result: QRCodeResult;
  duration: number;
  timestamp: Date;
}
```

#### QRGenerationFailedEvent

```typescript
interface QRGenerationFailedEvent {
  pluginId: string;
  params: QRGenerationParams;
  error: string;
  timestamp: Date;
}
```

## エラーハンドリング

### エラー型

#### PluginError

```typescript
class PluginError extends Error {
  constructor(
    public pluginId: string,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
```

#### QRGenerationError

```typescript
class QRGenerationError extends Error {
  constructor(
    message: string,
    public params: QRGenerationParams,
    public pluginId?: string
  ) {
    super(message);
    this.name = 'QRGenerationError';
  }
}
```

### エラーコード

| コード | 説明 |
|-------|------|
| `PLUGIN_NOT_FOUND` | プラグインが見つからない |
| `PLUGIN_DISABLED` | プラグインが無効 |
| `INVALID_PARAMS` | 不正なパラメータ |
| `QR_GENERATION_FAILED` | QRコード生成失敗 |
| `NETWORK_ERROR` | ネットワークエラー |
| `TIMEOUT` | タイムアウト |
| `UNSUPPORTED_FEATURE` | サポート外機能 |

### エラーハンドリングの例

```typescript
try {
  const result = await generateQRCode(params, 'my-wallet');
  
  if (!result.success) {
    throw new QRGenerationError(result.error!, params, 'my-wallet');
  }
  
  // 成功時の処理
  console.log('QRコード生成成功:', result.qrCodeDataURL);
  
} catch (error) {
  if (error instanceof PluginError) {
    console.error(`プラグインエラー [${error.pluginId}]:`, error.message);
  } else if (error instanceof QRGenerationError) {
    console.error('QRコード生成エラー:', error.message);
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

## 定数

### NetworkType

```typescript
enum NetworkType {
  MAIN_NET = 104,
  TEST_NET = 152
}
```

### QRErrorCorrectionLevel

```typescript
enum QRErrorCorrectionLevel {
  LOW = 'L',
  MEDIUM = 'M',
  QUARTILE = 'Q',
  HIGH = 'H'
}
```

### PluginFeatures

```typescript
enum PluginFeatures {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  HARDWARE = 'hardware',
  OFFLINE = 'offline',
  MULTI_SIG = 'multi-sig',
  ESCROW = 'escrow'
}
```

## 設定項目

### デフォルト値

```typescript
const DEFAULT_CONFIG = {
  qrSize: 256,
  colors: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  errorCorrectionLevel: 'M' as const,
  timeout: 30000,
  maxRetries: 3
};
```

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|-------|------|------------|
| `ENABLE_PLUGIN_DEBUG` | デバッグモード有効化 | `false` |
| `DEFAULT_PLUGIN_ID` | デフォルトプラグインID | `symbol-mobile` |
| `PLUGIN_TIMEOUT` | プラグインタイムアウト（秒） | `30` |
| `MAX_QR_SIZE` | 最大QRコードサイズ | `512` |

## バージョン互換性

### v1.0.0 → v2.0.0

**破壊的変更**:
- `QRGenerationParams.networkId` → `QRGenerationParams.networkType`
- `QRCodeResult.metadata` の型変更

**移行方法**:
```typescript
// v1.0.0
const params = {
  networkId: 104, // 旧形式
  // ...
};

// v2.0.0
const params = {
  networkType: NetworkType.MAIN_NET, // 新形式
  // ...
};
```

## パフォーマンス指標

### 推奨値

| 指標 | 推奨値 | 説明 |
|-----|-------|------|
| QRコード生成時間 | < 100ms | ユーザビリティ向上 |
| プラグイン初期化時間 | < 50ms | アプリ起動時間短縮 |
| メモリ使用量 | < 10MB | リソース効率化 |
| QRコードサイズ | 256×256px | 読み取り精度とサイズのバランス |

### 測定方法

```typescript
// パフォーマンス測定の例
const startTime = performance.now();

const result = await plugin.generateQRCode(params);

const endTime = performance.now();
const duration = endTime - startTime;

console.log(`QRコード生成時間: ${duration.toFixed(2)}ms`);
```

---

このAPIリファレンスは継続的に更新されます。最新の情報については、常に最新版のドキュメントを参照してください。
  margin?: number;
  
  /** 色設定 */
  color?: {
    /** 前景色（デフォルト: #000000） */
    dark?: string;
    /** 背景色（デフォルト: #FFFFFF） */
    light?: string;
  };
  
  /** 出力形式 */
  format?: 'png' | 'svg' | 'dataurl';
}
```

### QRGenerationResult

```typescript
interface QRGenerationResult {
  /** 生成されたQRコード（Data URL形式） */
  qrCode: string;
  
  /** ディープリンクURI */
  uri: string;
  
  /** ウォレット情報 */
  wallet: WalletInfo;
  
  /** 使用されたプラグインID */
  pluginId: string;
}
```

---

## 🔌 コアインターフェース

### QRGeneratorPlugin

```typescript
interface QRGeneratorPlugin {
  /** プラグインの一意ID */
  readonly id: string;
  
  /** プラグイン名 */
  readonly name: string;
  
  /** プラグインバージョン */
  readonly version: string;
  
  /** プラグインの説明 */
  readonly description: string;
  
  /** ウォレット情報 */
  readonly wallet: WalletInfo;
  
  /**
   * このプラグインがリクエストを処理できるかチェック
   * @param request 決済リクエスト
   * @returns 処理可能な場合 true
   */
  canHandle(request: PaymentRequest): boolean;
  
  /**
   * QRコードを生成
   * @param request 決済リクエスト
   * @param options QRコード生成オプション
   * @returns QRコードのData URL
   */
  generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string>;
  
  /**
   * ディープリンクURIを生成
   * @param request 決済リクエスト
   * @returns ディープリンクURI
   */
  generateUri(request: PaymentRequest): string;
  
  /**
   * 設定画面用コンポーネントを取得（オプション）
   * @returns React コンポーネント
   */
  getConfigComponent?(): React.ComponentType<any>;
}
```

### PluginManagerConfig

```typescript
interface PluginManagerConfig {
  /** デフォルトウォレットID */
  defaultWalletId?: string;
  
  /** 有効なプラグインIDのリスト */
  enabledPlugins: string[];
  
  /** プラグインごとの設定 */
  pluginSettings: Record<string, any>;
}
```

---

## 🎛️ プラグインマネージャー API

### QRPluginManager

#### コンストラクタ

```typescript
constructor(config?: Partial<PluginManagerConfig>)
```

**説明**: プラグインマネージャーを初期化します。

**パラメータ**:
- `config`: 初期設定（オプション）

#### プラグイン管理

```typescript
/**
 * プラグインを登録
 */
registerPlugin(plugin: QRGeneratorPlugin): void

/**
 * 複数のプラグインを一括登録
 */
registerPlugins(plugins: QRGeneratorPlugin[]): void

/**
 * プラグイン詳細情報を取得
 */
getPlugin(pluginId: string): QRGeneratorPlugin | undefined

/**
 * 全てのプラグインを取得（有効/無効に関係なく）
 */
getAllPlugins(): QRGeneratorPlugin[]

/**
 * 利用可能なウォレット一覧を取得（有効なプラグインのみ）
 */
getAvailableWallets(): Array<{ pluginId: string; wallet: WalletInfo }>
```

#### QRコード生成

```typescript
/**
 * 指定されたプラグインでQRコードを生成
 */
async generateQRCode(
  pluginId: string,
  request: PaymentRequest,
  options?: QRCodeOptions
): Promise<QRGenerationResult>

/**
 * 自動でプラグインを選択してQRコードを生成
 */
async generateAutoQRCode(
  request: PaymentRequest,
  options?: QRCodeOptions
): Promise<QRGenerationResult>
```

#### 設定管理

```typescript
/**
 * プラグインの設定を更新
 */
updateConfig(config: Partial<PluginManagerConfig>): void

/**
 * プラグインを有効/無効にする
 */
setPluginEnabled(pluginId: string, enabled: boolean): void

/**
 * デフォルトウォレットを設定
 */
setDefaultWallet(pluginId: string): void

/**
 * 設定を取得
 */
getConfig(): PluginManagerConfig
```

#### テストとデバッグ

```typescript
/**
 * プラグインをテストする
 */
async testPlugin(pluginId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}>

/**
 * デバッグ用：現在の設定を表示
 */
debugConfig(): void

/**
 * ローカルストレージの設定をクリア（テスト用）
 */
clearStoredConfig(): void
```

#### イベント管理

```typescript
/**
 * 設定変更イベントリスナーを追加
 */
addEventListener(listener: () => void): void

/**
 * イベントリスナーを削除
 */
removeEventListener(listener: () => void): void
```

---

## 🛠️ ユーティリティ関数

### QRコード生成ヘルパー

```typescript
/**
 * 標準的なQRコード生成
 * @param data QRコードに埋め込むデータ
 * @param options 生成オプション
 * @returns QRコードのData URL
 */
export async function generateStandardQR(
  data: string,
  options?: QRCodeOptions
): Promise<string> {
  const qrOptions = {
    width: options?.width || 256,
    height: options?.height || 256,
    margin: options?.margin || 4,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF'
    }
  };

  return await QRCode.toDataURL(data, qrOptions);
}

/**
 * Symbol用URI形式の生成
 * @param request 決済リクエスト
 * @returns Symbol形式のURI
 */
export function generateSymbolUri(request: PaymentRequest): string {
  const params = new URLSearchParams({
    recipient: request.recipientAddress,
    amount: request.amount.toString(),
    message: request.message || request.paymentId
  });

  return `symbol://payment?${params.toString()}`;
}
```

### バリデーション関数

```typescript
/**
 * Symbolアドレスの検証
 * @param address 検証するアドレス
 * @returns 有効な場合 true
 */
export function validateSymbolAddress(address: string): boolean {
  return /^[A-Z0-9]{39}$/.test(address);
}

/**
 * 金額の検証
 * @param amount 検証する金額
 * @returns 有効な場合 true
 */
export function validateAmount(amount: number | string): boolean {
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0;
}

/**
 * 決済リクエストの検証
 * @param request 検証するリクエスト
 * @returns 検証結果
 */
export function validatePaymentRequest(request: PaymentRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!validateSymbolAddress(request.recipientAddress)) {
    errors.push('無効なアドレス形式です');
  }

  if (!validateAmount(request.amount)) {
    errors.push('無効な金額です');
  }

  if (!request.paymentId || request.paymentId.trim() === '') {
    errors.push('決済IDが必要です');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## ⚛️ React コンポーネント

### WalletSelector

```typescript
interface WalletSelectorProps {
  /** 選択されたウォレットID */
  selectedWalletId?: string;
  
  /** ウォレット選択時のコールバック */
  onWalletSelect: (walletId: string) => void;
  
  /** CSSクラス名 */
  className?: string;
}

/**
 * ウォレット選択UI
 */
export function WalletSelector(props: WalletSelectorProps): JSX.Element
```

### PaymentQRDisplay

```typescript
interface PaymentQRDisplayProps {
  /** 決済データ */
  paymentData: PaymentRequest | PaymentData;
  
  /** CSSクラス名 */
  className?: string;
  
  /** ウォレット変更時のコールバック */
  onWalletChange?: (walletId: string) => void;
  
  /** デフォルトウォレットID */
  defaultWalletId?: string;
}

/**
 * 決済QRコード表示UI
 */
export function PaymentQRDisplay(props: PaymentQRDisplayProps): JSX.Element
```

### カスタムフック

```typescript
/**
 * プラグイン状態を管理するフック
 */
export function usePluginManager() {
  const [availableWallets, setAvailableWallets] = useState<Array<{ pluginId: string; wallet: WalletInfo }>>([]);
  const [config, setConfig] = useState<PluginManagerConfig>();

  useEffect(() => {
    const updateWallets = () => {
      setAvailableWallets(qrPluginManager.getAvailableWallets());
      setConfig(qrPluginManager.getConfig());
    };

    updateWallets();
    qrPluginManager.addEventListener(updateWallets);

    return () => {
      qrPluginManager.removeEventListener(updateWallets);
    };
  }, []);

  return {
    availableWallets,
    config,
    enablePlugin: (pluginId: string, enabled: boolean) => {
      qrPluginManager.setPluginEnabled(pluginId, enabled);
    },
    setDefaultWallet: (pluginId: string) => {
      qrPluginManager.setDefaultWallet(pluginId);
    },
    testPlugin: (pluginId: string) => {
      return qrPluginManager.testPlugin(pluginId);
    }
  };
}

/**
 * QRコード生成を管理するフック
 */
export function useQRGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQR = async (
    request: PaymentRequest,
    pluginId?: string,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult | null> => {
    try {
      setLoading(true);
      setError(null);

      let result: QRGenerationResult;
      if (pluginId) {
        result = await qrPluginManager.generateQRCode(pluginId, request, options);
      } else {
        result = await qrPluginManager.generateAutoQRCode(request, options);
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QRコード生成エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateQR
  };
}
```

---

## ⚙️ 設定管理

### ローカルストレージ

プラグイン設定は `localStorage` に自動保存されます：

```typescript
// ストレージキー
const STORAGE_KEY = 'xympay_plugin_config';

// 設定の構造
interface StoredConfig {
  defaultWalletId?: string;
  enabledPlugins: string[];
  pluginSettings: Record<string, any>;
}
```

### 設定の手動操作

```typescript
// 設定の取得
const config = qrPluginManager.getConfig();

// 特定プラグインの有効化
qrPluginManager.setPluginEnabled('symbol-mobile', true);

// デフォルトウォレットの設定
qrPluginManager.setDefaultWallet('symbol-mobile');

// カスタム設定の適用
qrPluginManager.updateConfig({
  pluginSettings: {
    'symbol-mobile': {
      qrSize: 300,
      color: '#FF0000'
    }
  }
});
```

### 設定の初期化

```typescript
// 全設定のクリア
qrPluginManager.clearStoredConfig();

// デフォルト設定の復元
const defaultConfig: PluginManagerConfig = {
  defaultWalletId: 'symbol-mobile',
  enabledPlugins: ['symbol-mobile', 'symbol-desktop', 'symbol-standard'],
  pluginSettings: {}
};

qrPluginManager.updateConfig(defaultConfig);
```

---

## 🔍 デバッグとログ

### デバッグ出力

```typescript
// プラグインマネージャーの状態確認
qrPluginManager.debugConfig();

// コンソール出力例:
// === Plugin Manager Debug ===
// Enabled plugins: ["symbol-mobile", "symbol-desktop"]
// Default wallet: symbol-mobile
// Available wallets: ["symbol-mobile", "symbol-desktop"]
// All registered plugins: ["symbol-mobile", "symbol-desktop", "symbol-standard"]
// LocalStorage value: {"enabledPlugins":["symbol-mobile","symbol-desktop"],...}
// =============================
```

### エラーハンドリング

```typescript
try {
  const result = await qrPluginManager.generateQRCode('invalid-plugin', request);
} catch (error) {
  if (error.message.includes('プラグインが見つかりません')) {
    console.error('指定されたプラグインが存在しません');
  } else if (error.message.includes('QRコード生成エラー')) {
    console.error('QRコード生成中にエラーが発生しました');
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

### ログレベル設定

```typescript
// 開発環境でのみデバッグログを有効化
const DEBUG = process.env.NODE_ENV === 'development';

class DebuggablePlugin implements QRGeneratorPlugin {
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    if (DEBUG) {
      console[level](`[${this.id}] ${message}`, data || '');
    }
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    this.log('info', 'QRコード生成開始', request);
    
    try {
      const result = await this.createQR(request, options);
      this.log('info', 'QRコード生成成功');
      return result;
    } catch (error) {
      this.log('error', 'QRコード生成失敗', error);
      throw error;
    }
  }
}
```

---

**このAPIリファレンスは随時更新されます。最新版は開発リポジトリをご確認ください。**
