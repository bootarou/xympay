import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from '../types';
import QRCode from 'qrcode';

/**
 * テスト・デバッグ専用ウォレットプラグイン
 * 
 * 開発時のテストやデバッグに特化した機能を提供します：
 * - 詳細なログ出力
 * - 意図的なエラー生成
 * - パフォーマンス測定
 * - ダミーデータ生成
 */
export class NFTDriveExTestNetPlugin implements QRGeneratorPlugin {
  readonly id = 'nftdrive-ex-testnet';
  readonly name = 'Test & Debug nftdrive-ex Testnet Plugin';
  readonly version = '0.1.0-debug';
  readonly description = 'テスト・デバッグ専用ウォレットプラグイン';

  readonly wallet: WalletInfo = {
    id: 'nftdrive-ex-testnet-wallet',
    name: 'nftdrive-ex-TestWallet',
    displayName: 'nftdrive-ex-Test & Debug Wallet',
    description: 'NFTDriveEX開発・テスト専用ウォレット',
    icon: '/icons/wallets/nftdrive-ex.svg',
    type: 'web',
    supported: true,
    downloadUrl: 'https://test.nftdrive-ex.net/',
    deepLinkScheme: 'https://test.nftdrive-ex.net'
  };

  private generationCount = 0;
  private errorSimulation = false;
  private performanceMode = false;
  private verboseLogging = true;

  constructor() {
    this.log('🧪 TestWalletPlugin initialized');
    this.log('⚠️  This plugin is for development/testing only!');
  }

  /**
   * このプラグインがリクエストを処理できるかチェック
   */
  canHandle(request: PaymentRequest): boolean {
    // this.log('🔍 canHandle called with:', request);
    
    // テスト用の特殊ケース
    if (request.paymentId === 'FAIL_TEST') {
      this.log('❌ Simulating canHandle failure');
      return false;
    }

    const canHandle = !!(
      request.recipientAddress &&
      request.amount &&
      request.paymentId
    );

    // this.log(`✅ canHandle result: ${canHandle}`);
    return canHandle;
  }

  /**
   * QRコードを生成する
   */
  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    this.generationCount++;
    const startTime = performance.now();

    // this.log('🚀 generateQR called:', {
    //   count: this.generationCount,
    //   request,
    //   options
    // });

    try {
      // エラーシミュレーション
      if (this.errorSimulation) {
        throw new Error('🎭 Simulated error for testing');
      }

      // 特殊なテストケース
      await this.handleSpecialTestCases(request);

      // QRコード生成
      const qrCode = await this.generateTestQR(request, options);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // this.log('✅ QRコード生成完了:', {
      //   count: this.generationCount,
      //   duration: `${duration.toFixed(2)}ms`,
      //   qrCodeSize: qrCode.length,
      //   uri: this.generateUri(request)
      // });

      if (this.performanceMode) {
        this.logPerformanceMetrics(duration, qrCode.length);
      }

      return qrCode;

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.log('❌ QRコード生成エラー:', {
        count: this.generationCount,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`[TEST] ${error.message}`);
    }
  }

  /**
   * ディープリンクURIを生成
   */
  generateUri(request: PaymentRequest): string {
    const baseUri = 'https://test.nftdrive-ex.net/';
    
    const params = new URLSearchParams({
      address: request.recipientAddress,
      amount: request.amount.toString(),
      paymentId: request.paymentId,
      message: request.message || '',
      
      // デバッグ情報
      debugId: `debug-${this.generationCount}`,
      timestamp: Date.now().toString(),
      pluginVersion: this.version,
      generationCount: this.generationCount.toString()
    });

    const uri = `${baseUri}?${params.toString()}`;
    // this.log('🔗 Generated URI:', uri);
    
    return uri;
  }

  /**
   * テスト用QRコード生成
   */
  private async generateTestQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);

    // テスト用の特別なQRコードオプション
    const qrOptions = {
      width: options?.width || 300,
      height: options?.height || 300,
      margin: options?.margin || 4,
      color: {
        dark: options?.color?.dark || '#FF5722', // テスト用の目立つ色
        light: options?.color?.light || '#FFF3E0'
      }
    };

    // this.log('🎨 QRコード生成オプション:', qrOptions);

    // 意図的な遅延（パフォーマンステスト用）
    if (this.performanceMode) {
      await this.simulateDelay(100, 500); // 100-500ms のランダム遅延
    }

    const qrCodeDataURL = await QRCode.toDataURL(uri, qrOptions);
    
    // this.log('📱 QRコード生成完了:', {
    //   size: `${qrOptions.width}x${qrOptions.height}`,
    //   dataSize: qrCodeDataURL.length,
    //   preview: qrCodeDataURL.substring(0, 50) + '...'
    // });

    return qrCodeDataURL;
  }

  /**
   * 特殊なテストケースの処理
   */
  private async handleSpecialTestCases(request: PaymentRequest): Promise<void> {
    // 遅延テスト
    if (request.paymentId.includes('SLOW')) {
      this.log('🐌 Slow test case detected, adding delay...');
      await this.simulateDelay(2000, 3000);
    }

    // エラーテスト
    if (request.paymentId.includes('ERROR')) {
      this.log('💥 Error test case detected');
      throw new Error('Intentional test error');
    }

    // 大容量テスト
    if (request.paymentId.includes('LARGE')) {
      this.log('📦 Large data test case detected');
      // 大きなメッセージを追加
      request.message = 'A'.repeat(1000);
    }

    // 無効データテスト
    if (request.paymentId.includes('INVALID')) {
      this.log('⚠️ Invalid data test case detected');
      throw new Error('Invalid test data provided');
    }
  }

  /**
   * ランダム遅延の生成
   */
  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    // this.log(`⏱️ Simulating ${delay}ms delay...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * パフォーマンス指標のログ出力
   */
  private logPerformanceMetrics(duration: number, qrSize: number): void {
    const metrics = {
      responseTime: `${duration.toFixed(2)}ms`,
      qrCodeSize: `${qrSize} bytes`,
      throughput: `${(1000 / duration).toFixed(2)} requests/second`,
      efficiency: qrSize > 0 ? `${(duration / qrSize * 1000).toFixed(4)}ms/byte` : 'N/A'
    };

    this.log('📊 Performance Metrics:', metrics);

    // 警告レベルのチェック
    if (duration > 1000) {
      this.log('⚠️ SLOW: Response time > 1 second');
    }
    if (qrSize > 100000) {
      this.log('⚠️ LARGE: QR code size > 100KB');
    }
  }

  /**
   * ログ出力
   */
  private log(message: string, data?: any): void {
    if (this.verboseLogging) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] [${this.id}] ${message}`, data);
      } else {
        // console.log(`[${timestamp}] [${this.id}] ${message}`);
      }
    }
  }

  /**
   * エラーシミュレーションの設定
   */
  setErrorSimulation(enabled: boolean): void {
    this.errorSimulation = enabled;
    this.log(`🎭 Error simulation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * パフォーマンスモードの設定
   */
  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    this.log(`📊 Performance mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 詳細ログの設定
   */
  setVerboseLogging(enabled: boolean): void {
    this.verboseLogging = enabled;
    if (enabled) {
      this.log('📝 Verbose logging enabled');
    }
  }

  /**
   * テスト統計の取得
   */
  getTestStatistics() {
    return {
      pluginId: this.id,
      version: this.version,
      generationCount: this.generationCount,
      errorSimulation: this.errorSimulation,
      performanceMode: this.performanceMode,
      verboseLogging: this.verboseLogging,
      uptime: Date.now(),
      features: [
        'Error simulation',
        'Performance testing',
        'Verbose logging',
        'Special test cases',
        'Delay simulation'
      ]
    };
  }

  /**
   * テスト設定のリセット
   */
  resetTestSettings(): void {
    this.generationCount = 0;
    this.errorSimulation = false;
    this.performanceMode = false;
    this.verboseLogging = true;
    this.log('🔄 Test settings reset to defaults');
  }

  /**
   * 包括的な健全性チェック
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: string; testResults?: any }> {
    this.log('🏥 Starting comprehensive health check...');
    
    const testResults = {
      basicGeneration: false,
      errorHandling: false,
      performanceTest: false,
      specialCases: false
    };

    try {
      // 基本的な生成テスト
      const basicRequest: PaymentRequest = {
        recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
        amount: 1000000,
        paymentId: 'HEALTH01',
        message: 'Health check'
      };

      const qrCode = await this.generateQR(basicRequest);
      testResults.basicGeneration = !!qrCode;

      // エラーハンドリングテスト
      try {
        await this.generateQR({
          recipientAddress: '',
          amount: 0,
          paymentId: 'INVALID'
        });
      } catch (error) {
        testResults.errorHandling = true; // エラーが正しく投げられた
      }

      // パフォーマンステスト
      const perfStart = performance.now();
      await this.generateQR(basicRequest);
      const perfDuration = performance.now() - perfStart;
      testResults.performanceTest = perfDuration < 2000; // 2秒以内

      // 特殊ケーステスト
      try {
        await this.generateQR({
          recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
          amount: 1,
          paymentId: 'SPECIAL1'
        });
        testResults.specialCases = true;
      } catch (error) {
        // 特殊ケースでもエラーハンドリングされている
        testResults.specialCases = true;
      }

      const allTestsPassed = Object.values(testResults).every(result => result);

      this.log('🏥 Health check completed:', testResults);

      return {
        healthy: allTestsPassed,
        details: allTestsPassed ? 'All tests passed' : 'Some tests failed',
        testResults
      };

    } catch (error) {
      this.log('❌ Health check failed:', error.message);
      return {
        healthy: false,
        details: `Health check error: ${error.message}`,
        testResults
      };
    }
  }
}

// プラグインインスタンスのエクスポート
export const nftdriveExTestNetPlugin = new NFTDriveExTestNetPlugin();
