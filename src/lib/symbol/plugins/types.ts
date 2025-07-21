/**
 * QRコード生成プラグインの型定義
 */

export interface PaymentRequest {
  recipientAddress: string;
  amount: number | string;
  paymentId: string;
  currency?: string;
  message?: string;
}

export interface QRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  format?: 'png' | 'svg' | 'dataurl';
}

export interface WalletInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string; // SVGまたは画像URL
  type: 'mobile' | 'desktop' | 'web' | 'hardware';
  supported: boolean;
  downloadUrl?: string;
  deepLinkScheme?: string;
}

export interface QRGeneratorPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  wallet: WalletInfo;
  
  /**
   * このプラグインが対応可能かチェック
   */
  canHandle(request: PaymentRequest): boolean;
  
  /**
   * QRコードを生成
   */
  generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string>;
  
  /**
   * ディープリンクURIを生成
   */
  generateUri(request: PaymentRequest): string;
  
  /**
   * 設定画面用のコンポーネント（オプション）
   */
  getConfigComponent?(): React.ComponentType<any>;
}

export interface PluginManagerConfig {
  defaultWalletId?: string;
  enabledPlugins: string[];
  pluginSettings: Record<string, any>;
}

export interface QRGenerationResult {
  qrCode: string;
  uri: string;
  wallet: WalletInfo;
  pluginId: string;
}
