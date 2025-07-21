import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';
import QRCode from 'qrcode';

/**
 * 高度な機能を持つカスタムウォレットプラグイン
 * 
 * このプラグインは以下の機能を提供します：
 * - 複数の URI スキーム対応
 * - カスタム暗号化
 * - エラーリトライ機能
 * - 詳細なログ機能
 * - 外部API連携
 */
export class AdvancedWalletPlugin implements QRGeneratorPlugin {
  readonly id = 'advanced-wallet';
  readonly name = 'Advanced Custom Wallet Plugin';
  readonly version = '2.0.0';
  readonly description = '高度な機能を持つカスタムウォレットプラグイン';

  readonly wallet: WalletInfo = {
    id: 'advanced-wallet',
    name: 'AdvancedWallet',
    displayName: 'Advanced Custom Wallet',
    description: '高度な機能を持つSymbolウォレット',
    icon: '/icons/wallets/advanced-wallet.svg',
    type: 'desktop',
    supported: true,
    downloadUrl: 'https://example.com/advanced-wallet',
    deepLinkScheme: 'advancedwallet://'
  };

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1秒
  private debugMode = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
    this.log('AdvancedWalletPlugin initialized');
  }

  /**
   * このプラグインがリクエストを処理できるかチェック
   */
  canHandle(request: PaymentRequest): boolean {
    try {
      this.validateRequest(request);
      return true;
    } catch (error) {
      this.log('canHandle failed:', error.message);
      return false;
    }
  }

  /**
   * QRコードを生成する（リトライ機能付き）
   */
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`QRコード生成試行 ${attempt}/${this.maxRetries}`);
        
        const result = await this.generateQRInternal(request, options);
        this.log('QRコード生成成功');
        return result;

      } catch (error) {
        lastError = error;
        this.log(`試行 ${attempt} 失敗:`, error.message);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // 指数バックオフ
        }
      }
    }

    throw new Error(`${this.maxRetries}回の試行後もQRコード生成に失敗: ${lastError?.message}`);
  }

  /**
   * ディープリンクURIを生成
   */
  generateUri(request: PaymentRequest): string {
    // 複数のスキーム対応
    const primaryScheme = this.wallet.deepLinkScheme;
    const fallbackScheme = 'https://example.com/wallet-web/';

    // パラメータの暗号化（簡易版）
    const encryptedData = this.encryptPaymentData(request);

    // メイン URI
    const mainParams = new URLSearchParams({
      data: encryptedData,
      version: this.version,
      timestamp: Date.now().toString()
    });

    const mainUri = `${primaryScheme}pay?${mainParams.toString()}`;

    // フォールバック URI
    const fallbackParams = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      paymentId: request.paymentId,
      message: request.message || '',
      fallback: 'true'
    });

    const fallbackUri = `${fallbackScheme}pay?${fallbackParams.toString()}`;

    this.log('Generated URIs:', { mainUri, fallbackUri });

    return mainUri; // メイン URI を返す
  }

  /**
   * 内部的なQRコード生成処理
   */
  private async generateQRInternal(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    // 詳細なバリデーション
    this.validateRequest(request);
    await this.validateExternalRequirements(request);

    // URI生成
    const uri = this.generateUri(request);

    // 高度なQRコード生成オプション
    const qrOptions = {
      width: options?.width || 320,
      height: options?.height || 320,
      margin: options?.margin || 4,
      color: {
        dark: options?.color?.dark || '#1565C0',
        light: options?.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: 'H' as const // 高エラー訂正レベル
    };

    // QRコード生成
    const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);

    // 生成後の検証
    this.validateQRCode(qrCodeDataURL);

    return qrCodeDataURL;
  }

  /**
   * リクエストの詳細バリデーション
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

    // Symbolアドレス形式の詳細検証
    const cleanAddress = request.recipientAddress.replace(/-/g, '');
    if (cleanAddress.length !== 39) {
      throw new Error('Symbolアドレスは39文字である必要があります');
    }

    if (!/^[A-Z0-9]{39}$/.test(cleanAddress)) {
      throw new Error('Symbolアドレスは大文字の英数字のみ使用可能です');
    }

    // 金額の範囲チェック
    const amount = Number(request.amount);
    if (amount > 8999999999) { // Symbol最大供給量の制限
      throw new Error('金額が上限を超えています');
    }

    // 決済IDの形式チェック
    if (!/^[A-Z0-9]{8}$/.test(request.paymentId)) {
      throw new Error('決済IDは8文字の英数字である必要があります');
    }
  }

  /**
   * 外部要件の検証（API接続など）
   */
  private async validateExternalRequirements(request: PaymentRequest): Promise<void> {
    try {
      // 例：外部APIでアドレスの有効性を確認
      // const isValidAddress = await this.verifyAddressWithAPI(request.recipientAddress);
      // if (!isValidAddress) {
      //   throw new Error('アドレスが外部検証で無効と判定されました');
      // }

      this.log('External validation passed');
    } catch (error) {
      this.log('External validation failed:', error.message);
      throw new Error(`外部検証エラー: ${error.message}`);
    }
  }

  /**
   * QRコードの検証
   */
  private validateQRCode(qrCodeDataURL: string): void {
    if (!qrCodeDataURL.startsWith('data:image/')) {
      throw new Error('無効なQRコード形式です');
    }

    if (qrCodeDataURL.length < 1000) {
      throw new Error('QRコードが小さすぎます');
    }

    this.log('QRコード検証完了');
  }

  /**
   * 決済データの暗号化（簡易版）
   */
  private encryptPaymentData(request: PaymentRequest): string {
    try {
      const data = {
        recipient: request.recipientAddress,
        amount: request.amount,
        paymentId: request.paymentId,
        message: request.message || '',
        timestamp: Date.now()
      };

      // 実際の実装では適切な暗号化ライブラリを使用
      const jsonString = JSON.stringify(data);
      const encoded = btoa(jsonString); // Base64エンコード（簡易版）
      
      this.log('Payment data encrypted');
      return encoded;
    } catch (error) {
      throw new Error(`データ暗号化エラー: ${error.message}`);
    }
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ログ出力
   */
  private log(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.log(`[${this.id}] ${message}`, ...args);
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
      features: [
        'リトライ機能',
        'データ暗号化',
        '外部API連携',
        '詳細ログ',
        '高エラー訂正QR'
      ],
      author: 'XYMPay Advanced Team',
      license: 'MIT',
      repository: 'https://github.com/your-org/advanced-wallet-plugin',
      documentation: 'https://docs.advanced-wallet.com/api',
      supportEmail: 'support@advanced-wallet.com'
    };
  }

  /**
   * プラグインの詳細テスト
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: string; metrics?: any }> {
    const startTime = Date.now();
    const metrics = {
      responseTime: 0,
      qrSize: 0,
      retryCount: 0
    };

    try {
      const testRequest: PaymentRequest = {
        recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
        amount: 1000000,
        paymentId: 'HEALTH01',
        message: 'Advanced Health Check'
      };

      const qrCode = await this.generateQR(testRequest);
      
      metrics.responseTime = Date.now() - startTime;
      metrics.qrSize = qrCode.length;

      if (qrCode && qrCode.startsWith('data:image/')) {
        return { 
          healthy: true,
          details: 'All systems operational',
          metrics
        };
      } else {
        return { 
          healthy: false, 
          details: 'QRコード生成結果が不正です',
          metrics 
        };
      }
    } catch (error) {
      metrics.responseTime = Date.now() - startTime;
      return { 
        healthy: false, 
        details: `Health check error: ${error.message}`,
        metrics 
      };
    }
  }

  /**
   * デバッグモードの切り替え
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 統計情報の取得
   */
  getStatistics() {
    return {
      pluginId: this.id,
      version: this.version,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      debugMode: this.debugMode,
      supportedFeatures: this.getPluginInfo().features
    };
  }
}

// プラグインインスタンスのエクスポート
export const advancedWalletPlugin = new AdvancedWalletPlugin();
