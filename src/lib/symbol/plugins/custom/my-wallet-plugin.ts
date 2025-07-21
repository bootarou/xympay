import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';
import QRCode from 'qrcode';

/**
 * カスタムウォレット用のサンプルプラグイン
 * 
 * このプラグインは、独自のウォレットアプリケーション用の
 * QRコード生成とディープリンク機能を提供します。
 */
export class MyWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'my-wallet';
  readonly name = 'My Custom Wallet Plugin';
  readonly version = '1.0.0';
  readonly description = 'カスタム開発されたSymbolウォレット用プラグイン';

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
    return !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );
  }
  /**
   * QRコードを生成する
   */
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    try {
      // 入力パラメータの検証
      this.validateRequest(request);

      // カスタムウォレット用のURI形式を生成
      const uri = this.generateUri(request);

      // QRコード生成オプション
      const qrOptions = {
        width: options?.width || 256,
        height: options?.height || 256,
        margin: options?.margin || 2,
        color: {
          dark: options?.color?.dark || '#2E7D32',  // カスタムウォレットのブランドカラー
          light: options?.color?.light || '#FFFFFF'
        }
      };

      // QRコードを生成
      const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
      return qrCodeDataURL;

    } catch (error) {
      console.error(`[${this.id}] QRコード生成エラー:`, error);
      throw new Error(`QRコード生成に失敗しました: ${error.message}`);
    }
  }

  /**
   * ディープリンクURIを生成
   */
  generateUri(request: PaymentRequest): string {
    // カスタムウォレットのディープリンクスキーム
    const baseScheme = 'mywallet://pay';
    
    // パラメータを構築
    const queryParams = new URLSearchParams({
      // 基本パラメータ
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      paymentId: request.paymentId,
      
      // オプションパラメータ
      message: request.message || '',
      
      // カスタムウォレット固有のパラメータ
      timestamp: Date.now().toString(),
      version: this.version,
      
      // メタデータ
      source: 'xympay',
      pluginId: this.id
    });

    return `${baseScheme}?${queryParams.toString()}`;
  }
  /**
   * 入力パラメータの検証
   */
  private validateRequest(request: PaymentRequest): void {
    if (!request.recipientAddress) {
      throw new Error('受信者アドレスが指定されていません');
    }

    if (!request.amount || Number(request.amount) <= 0) {
      throw new Error('金額は0より大きい値を指定してください');
    }

    if (!request.paymentId) {
      throw new Error('決済IDが指定されていません');
    }

    // Symbolアドレス形式の検証（簡易版）
    const cleanAddress = request.recipientAddress.replace(/-/g, '');
    if (cleanAddress.length !== 39 || !/^[A-Z0-9]{39}$/.test(cleanAddress)) {
      throw new Error('無効なSymbolアドレス形式です');
    }
  }

  /**
   * プラグインの詳細情報を取得
   */
  getPluginInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      wallet: this.wallet,
      author: 'XYMPay Development Team',
      license: 'MIT',
      repository: 'https://github.com/your-org/my-wallet-plugin',
      documentation: 'https://docs.your-wallet.com/api',
      supportEmail: 'support@your-wallet.com'
    };
  }

  /**
   * プラグインの健全性チェック
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    try {
      // 基本的な動作確認
      const testRequest: PaymentRequest = {
        recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
        amount: 1000000, // 1 XYM
        paymentId: 'HEALTH_CHECK',
        message: 'Health Check'
      };

      const qrCode = await this.generateQR(testRequest);
      
      if (qrCode && qrCode.startsWith('data:image/')) {
        return { healthy: true };
      } else {
        return { 
          healthy: false, 
          details: 'QRコード生成結果が不正です' 
        };
      }
    } catch (error) {
      return { 
        healthy: false, 
        details: `Health check error: ${error.message}` 
      };
    }
  }
}

// プラグインインスタンスのエクスポート
export const myWalletPlugin = new MyWalletPlugin();
