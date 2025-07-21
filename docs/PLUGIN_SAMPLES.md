# プラグインサンプル集

## 概要

XYMPayウォレットプラグイン開発のためのサンプルコード集です。様々なユースケースに対応したプラグインの実装例を提供します。

## 目次

1. [基本的なプラグイン](#基本的なプラグイン)
2. [モバイルウォレット対応](#モバイルウォレット対応)
3. [デスクトップウォレット対応](#デスクトップウォレット対応)
4. [カスタムURI形式](#カスタムuri形式)
5. [高度な設定オプション](#高度な設定オプション)
6. [エラーハンドリング](#エラーハンドリング)
7. [国際化対応](#国際化対応)
8. [テスト用プラグイン](#テスト用プラグイン)

## 基本的なプラグイン

### シンプルなウォレットプラグイン

最小限の機能を持つプラグインの例です。

```typescript
// src/lib/symbol/plugins/simple-wallet-plugin.ts
import { QRGeneratorPlugin, QRGenerationParams, QRCodeResult } from './types';
import QRCode from 'qrcode';

export class SimpleWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'simple-wallet';
  readonly name = 'Simple Wallet';
  readonly description = 'シンプルなウォレット用のQRコードプラグイン';
  readonly icon = '/icons/wallets/simple.svg';
  readonly version = '1.0.0';

  async generateQRCode(params: QRGenerationParams): Promise<QRCodeResult> {
    try {
      // 基本的なURI形式を構築
      const uri = `simple://pay?to=${params.recipientAddress}&amount=${params.amount}&id=${params.paymentId}`;
      
      // QRコードを生成
      const qrCodeDataURL = await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2
      });

      return {
        success: true,
        qrCodeDataURL,
        uri,
        instructions: 'Simple Walletアプリでスキャンしてください'
      };
    } catch (error) {
      return {
        success: false,
        error: `QRコード生成に失敗しました: ${error.message}`
      };
    }
  }
}
```

### 登録用のエクスポート

```typescript
// src/lib/symbol/plugins/simple-wallet-plugin.ts (続き)
export const simpleWalletPlugin = new SimpleWalletPlugin();

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);
    
    const qrOptions = {
      width: options?.width || 256,
      height: options?.height || 256,
      margin: options?.margin || 4,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    };

    return await QRCode.toDataURL(uri, qrOptions);
  }

  generateUri(request: PaymentRequest): string {
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.message || request.paymentId
    });

    return `${this.wallet.deepLinkScheme}pay?${params.toString()}`;
  }
}
```

---

## 🎨 カスタムQRデザインプラグイン

ブランドカラーやロゴを含むカスタムQRコードを生成するプラグインです。

```typescript
// src/lib/symbol/plugins/samples/custom-design-plugin.ts
import QRCode from 'qrcode';
import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';

export class CustomDesignPlugin implements QRGeneratorPlugin {
  readonly id = 'custom-design-wallet';
  readonly name = 'Custom Design Wallet';
  readonly version = '1.0.0';
  readonly description = 'カスタムデザインQRコード生成プラグイン';

  readonly wallet: WalletInfo = {
    id: 'custom-design-wallet',
    name: 'CustomDesignWallet',
    displayName: 'カスタムデザインウォレット',
    description: 'ブランドカラー対応ウォレット',
    icon: '/icons/wallets/custom-design.svg',
    type: 'mobile',
    supported: true,
    downloadUrl: 'https://example.com/custom-wallet',
    deepLinkScheme: 'customwallet://'
  };

  // ブランドカラー設定
  private readonly brandColors = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#06B6D4'
  };

  canHandle(request: PaymentRequest): boolean {
    return !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);
    
    // カスタムデザインオプション
    const customOptions = {
      width: options?.width || 300,
      height: options?.height || 300,
      margin: options?.margin || 6,
      color: {
        dark: options?.color?.dark || this.brandColors.primary,
        light: options?.color?.light || '#FFFFFF'
      },
      // 高品質設定
      errorCorrectionLevel: 'M' as const,
      type: 'image/png' as const,
      quality: 0.92,
      scale: 4
    };

    try {
      // 基本QRコードを生成
      const qrCodeDataURL = await QRCode.toDataURL(uri, customOptions);
      
      // ロゴオーバーレイを追加（オプション）
      if (options?.format !== 'svg') {
        return await this.addLogoOverlay(qrCodeDataURL, customOptions);
      }
      
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`カスタムQRコード生成エラー: ${error.message}`);
    }
  }

  generateUri(request: PaymentRequest): string {
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.message || request.paymentId,
      wallet: this.id,
      timestamp: Date.now().toString()
    });

    return `${this.wallet.deepLinkScheme}pay?${params.toString()}`;
  }

  /**
   * QRコードの中央にロゴを追加
   */
  private async addLogoOverlay(qrCodeDataURL: string, options: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(qrCodeDataURL);
        return;
      }

      const qrImage = new Image();
      qrImage.onload = () => {
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;
        
        // QRコードを描画
        ctx.drawImage(qrImage, 0, 0);
        
        // 中央に白い円を描画（ロゴ用背景）
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const logoSize = canvas.width * 0.2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // ボーダーを追加
        ctx.strokeStyle = this.brandColors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // ロゴテキストを追加（実際の実装ではロゴ画像を使用）
        ctx.fillStyle = this.brandColors.primary;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('WALLET', centerX, centerY + 4);
        
        resolve(canvas.toDataURL());
      };
      
      qrImage.onerror = () => resolve(qrCodeDataURL);
      qrImage.src = qrCodeDataURL;
    });
  }
}
```

---

## 🌐 外部API連携プラグイン

外部APIを利用して動的にウォレット情報を取得するプラグインです。

```typescript
// src/lib/symbol/plugins/samples/api-integrated-plugin.ts
import QRCode from 'qrcode';
import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';

interface ExternalWalletConfig {
  apiEndpoint: string;
  apiKey: string;
  walletVersion: string;
  features: string[];
}

export class ApiIntegratedPlugin implements QRGeneratorPlugin {
  readonly id = 'api-integrated-wallet';
  readonly name = 'API Integrated Wallet';
  readonly version = '1.0.0';
  readonly description = '外部API連携ウォレットプラグイン';

  readonly wallet: WalletInfo = {
    id: 'api-integrated-wallet',
    name: 'ApiIntegratedWallet',
    displayName: 'API連携ウォレット',
    description: '外部サービスと連携するウォレット',
    icon: '/icons/wallets/api-wallet.svg',
    type: 'web',
    supported: true,
    downloadUrl: 'https://api-wallet.example.com',
    deepLinkScheme: 'apiwallet://'
  };

  private config: ExternalWalletConfig | null = null;
  private configCache: Map<string, any> = new Map();
  private initialized = false;

  canHandle(request: PaymentRequest): boolean {
    return !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    // 初期化確認
    await this.ensureInitialized();
    
    // 外部APIで決済情報を検証
    const validationResult = await this.validatePaymentRequest(request);
    if (!validationResult.isValid) {
      throw new Error(`決済リクエストが無効です: ${validationResult.error}`);
    }

    // 動的URI生成
    const uri = await this.generateDynamicUri(request);
    
    // 外部API設定に基づくQRコード生成
    const qrOptions = await this.buildQROptions(options);
    
    return await QRCode.toDataURL(uri, qrOptions);
  }

  generateUri(request: PaymentRequest): string {
    // 基本URIを生成（API利用不可時のフォールバック）
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.message || request.paymentId
    });

    return `${this.wallet.deepLinkScheme}pay?${params.toString()}`;
  }

  /**
   * 初期化確認
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeFromAPI();
    }
  }

  /**
   * 外部APIから設定を取得
   */
  private async initializeFromAPI(): Promise<void> {
    try {
      const response = await fetch('/api/wallet-config', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      this.config = await response.json();
      this.initialized = true;
      
      console.log(`[${this.id}] 外部API設定を読み込みました:`, this.config);
      
    } catch (error) {
      console.warn(`[${this.id}] 外部API設定の読み込みに失敗、デフォルト設定を使用:`, error);
      
      // フォールバック設定
      this.config = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'fallback-key',
        walletVersion: '1.0.0',
        features: ['qr-generation', 'deep-linking']
      };
      this.initialized = true;
    }
  }

  /**
   * 決済リクエストを外部APIで検証
   */
  private async validatePaymentRequest(request: PaymentRequest): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    if (!this.config) {
      return { isValid: true }; // 設定がない場合はスキップ
    }

    try {
      const cacheKey = `validation_${request.paymentId}`;
      
      // キャッシュチェック
      if (this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey);
      }

      const response = await fetch(`${this.config.apiEndpoint}/validate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();
      
      // 結果をキャッシュ（5分間）
      this.configCache.set(cacheKey, result);
      setTimeout(() => this.configCache.delete(cacheKey), 5 * 60 * 1000);
      
      return result;
      
    } catch (error) {
      console.warn(`[${this.id}] 決済リクエスト検証エラー:`, error);
      return { isValid: true }; // エラー時はスキップ
    }
  }

  /**
   * 動的URIを生成
   */
  private async generateDynamicUri(request: PaymentRequest): Promise<string> {
    if (!this.config?.features.includes('dynamic-uri')) {
      return this.generateUri(request);
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}/generate-uri`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          ...request,
          walletId: this.id,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const { uri } = await response.json();
        return uri;
      }
    } catch (error) {
      console.warn(`[${this.id}] 動的URI生成エラー、フォールバック使用:`, error);
    }

    return this.generateUri(request);
  }

  /**
   * 外部API設定に基づくQRオプションを構築
   */
  private async buildQROptions(options?: QRCodeOptions): Promise<any> {
    const defaultOptions = {
      width: options?.width || 256,
      height: options?.height || 256,
      margin: options?.margin || 4,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    };

    if (!this.config?.features.includes('custom-qr-options')) {
      return defaultOptions;
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}/qr-options`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (response.ok) {
        const apiOptions = await response.json();
        return { ...defaultOptions, ...apiOptions };
      }
    } catch (error) {
      console.warn(`[${this.id}] QRオプション取得エラー:`, error);
    }

    return defaultOptions;
  }
}
```

---

## ⚙️ 設定可能プラグイン

ユーザーが詳細設定を行えるプラグインです。

```typescript
// src/lib/symbol/plugins/samples/configurable-plugin.ts
import QRCode from 'qrcode';
import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';

interface ConfigurableWalletSettings {
  qrSize: number;
  qrMargin: number;
  primaryColor: string;
  secondaryColor: string;
  enableLogo: boolean;
  logoPosition: 'center' | 'top-right' | 'bottom-right';
  customMessage: string;
  enableTimestamp: boolean;
  uriFormat: 'standard' | 'extended' | 'custom';
}

export class ConfigurablePlugin implements QRGeneratorPlugin {
  readonly id = 'configurable-wallet';
  readonly name = 'Configurable Wallet';
  readonly version = '1.0.0';
  readonly description = '設定可能なウォレットプラグイン';

  readonly wallet: WalletInfo = {
    id: 'configurable-wallet',
    name: 'ConfigurableWallet',
    displayName: '設定可能ウォレット',
    description = 'ユーザーが詳細設定できるウォレット',
    icon: '/icons/wallets/configurable.svg',
    type: 'desktop',
    supported: true,
    downloadUrl: 'https://configurable-wallet.example.com',
    deepLinkScheme: 'configurablewallet://'
  };

  // デフォルト設定
  private readonly defaultSettings: ConfigurableWalletSettings = {
    qrSize: 256,
    qrMargin: 4,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    enableLogo: true,
    logoPosition: 'center',
    customMessage: '',
    enableTimestamp: false,
    uriFormat: 'standard'
  };

  canHandle(request: PaymentRequest): boolean {
    return !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const settings = this.getCurrentSettings();
    const uri = this.generateUri(request);
    
    // 設定に基づくQRオプション
    const qrOptions = {
      width: options?.width || settings.qrSize,
      height: options?.height || settings.qrSize,
      margin: options?.margin || settings.qrMargin,
      color: {
        dark: options?.color?.dark || settings.primaryColor,
        light: options?.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    try {
      let qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
      
      // ロゴオーバーレイ
      if (settings.enableLogo) {
        qrCodeDataURL = await this.addConfigurableLogo(qrCodeDataURL, settings);
      }
      
      return qrCodeDataURL;
      
    } catch (error) {
      throw new Error(`設定可能QRコード生成エラー: ${error.message}`);
    }
  }

  generateUri(request: PaymentRequest): string {
    const settings = this.getCurrentSettings();
    
    // 基本パラメータ
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: this.buildMessage(request, settings)
    });

    // 拡張パラメータ
    if (settings.uriFormat === 'extended' || settings.uriFormat === 'custom') {
      params.append('paymentId', request.paymentId);
      params.append('walletId', this.id);
      
      if (settings.enableTimestamp) {
        params.append('timestamp', Date.now().toString());
      }
      
      if (settings.customMessage) {
        params.append('customMessage', settings.customMessage);
      }
    }

    // カスタムフォーマット
    if (settings.uriFormat === 'custom') {
      return this.generateCustomUri(request, settings, params);
    }

    return `${this.wallet.deepLinkScheme}pay?${params.toString()}`;
  }

  /**
   * 設定画面コンポーネントを取得
   */
  getConfigComponent() {
    return ConfigurableWalletConfig;
  }

  /**
   * 現在の設定を取得
   */
  private getCurrentSettings(): ConfigurableWalletSettings {
    // プラグインマネージャーから設定を取得
    const storedSettings = this.getStoredSettings();
    return { ...this.defaultSettings, ...storedSettings };
  }

  /**
   * 保存された設定を取得
   */
  private getStoredSettings(): Partial<ConfigurableWalletSettings> {
    try {
      const pluginSettings = JSON.parse(
        localStorage.getItem('xympay_plugin_config') || '{}'
      );
      return pluginSettings.pluginSettings?.[this.id] || {};
    } catch {
      return {};
    }
  }

  /**
   * メッセージを構築
   */
  private buildMessage(request: PaymentRequest, settings: ConfigurableWalletSettings): string {
    let message = request.message || request.paymentId;
    
    if (settings.customMessage) {
      message = `${settings.customMessage}: ${message}`;
    }
    
    return message;
  }

  /**
   * カスタムURI生成
   */
  private generateCustomUri(
    request: PaymentRequest,
    settings: ConfigurableWalletSettings,
    params: URLSearchParams
  ): string {
    // カスタムスキーム使用
    const customScheme = settings.enableTimestamp ? 
      'configurablewallet-v2://' : 
      'configurablewallet://';
    
    return `${customScheme}pay?${params.toString()}`;
  }

  /**
   * 設定可能ロゴを追加
   */
  private async addConfigurableLogo(
    qrCodeDataURL: string,
    settings: ConfigurableWalletSettings
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(qrCodeDataURL);
        return;
      }

      const qrImage = new Image();
      qrImage.onload = () => {
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;
        ctx.drawImage(qrImage, 0, 0);
        
        // ロゴ位置計算
        const logoSize = canvas.width * 0.15;
        let logoX: number, logoY: number;
        
        switch (settings.logoPosition) {
          case 'top-right':
            logoX = canvas.width - logoSize - 10;
            logoY = 10;
            break;
          case 'bottom-right':
            logoX = canvas.width - logoSize - 10;
            logoY = canvas.height - logoSize - 10;
            break;
          case 'center':
          default:
            logoX = (canvas.width - logoSize) / 2;
            logoY = (canvas.height - logoSize) / 2;
            break;
        }
        
        // ロゴ背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
        
        // ロゴボーダー
        ctx.strokeStyle = settings.secondaryColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
        
        // ロゴアイコン（簡易実装）
        ctx.fillStyle = settings.primaryColor;
        ctx.fillRect(logoX + logoSize * 0.2, logoY + logoSize * 0.2, logoSize * 0.6, logoSize * 0.6);
        
        resolve(canvas.toDataURL());
      };
      
      qrImage.onerror = () => resolve(qrCodeDataURL);
      qrImage.src = qrCodeDataURL;
    });
  }
}

// 設定コンポーネント
import React, { useState, useEffect } from 'react';

interface ConfigurableWalletConfigProps {
  settings: ConfigurableWalletSettings;
  onSettingsChange: (settings: ConfigurableWalletSettings) => void;
}

export function ConfigurableWalletConfig({ 
  settings, 
  onSettingsChange 
}: ConfigurableWalletConfigProps) {
  const [localSettings, setLocalSettings] = useState<ConfigurableWalletSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof ConfigurableWalletSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
  };

  const handleReset = () => {
    const defaultSettings: ConfigurableWalletSettings = {
      qrSize: 256,
      qrMargin: 4,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      enableLogo: true,
      logoPosition: 'center',
      customMessage: '',
      enableTimestamp: false,
      uriFormat: 'standard'
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900">設定可能ウォレット 設定</h3>
      
      {/* QRコード設定 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">QRコード設定</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QRコードサイズ
            </label>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={localSettings.qrSize}
              onChange={(e) => handleChange('qrSize', Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-500">{localSettings.qrSize}px</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              マージン
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={localSettings.qrMargin}
              onChange={(e) => handleChange('qrMargin', Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-500">{localSettings.qrMargin}</span>
          </div>
        </div>
      </div>

      {/* 色設定 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">色設定</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プライマリカラー
            </label>
            <input
              type="color"
              value={localSettings.primaryColor}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              セカンダリカラー
            </label>
            <input
              type="color"
              value={localSettings.secondaryColor}
              onChange={(e) => handleChange('secondaryColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* ロゴ設定 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">ロゴ設定</h4>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.enableLogo}
              onChange={(e) => handleChange('enableLogo', e.target.checked)}
              className="mr-2"
            />
            ロゴを表示
          </label>
        </div>
        
        {localSettings.enableLogo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ロゴ位置
            </label>
            <select
              value={localSettings.logoPosition}
              onChange={(e) => handleChange('logoPosition', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="center">中央</option>
              <option value="top-right">右上</option>
              <option value="bottom-right">右下</option>
            </select>
          </div>
        )}
      </div>

      {/* URI設定 */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">URI設定</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URIフォーマット
          </label>
          <select
            value={localSettings.uriFormat}
            onChange={(e) => handleChange('uriFormat', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="standard">標準</option>
            <option value="extended">拡張</option>
            <option value="custom">カスタム</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カスタムメッセージ
          </label>
          <input
            type="text"
            value={localSettings.customMessage}
            onChange={(e) => handleChange('customMessage', e.target.value)}
            placeholder="カスタムメッセージを入力"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.enableTimestamp}
              onChange={(e) => handleChange('enableTimestamp', e.target.checked)}
              className="mr-2"
            />
            タイムスタンプを含める
          </label>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex space-x-3 pt-4 border-t">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          設定を保存
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
```

---

これらのサンプルプラグインを参考に、独自の要件に合わせたプラグインを開発してください。各プラグインは独立しており、必要な機能のみを実装することも可能です。
