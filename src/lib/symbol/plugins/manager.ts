import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, QRGenerationResult, PluginManagerConfig } from './types';

/**
 * QRコード生成プラグインマネージャー
 */
export class QRPluginManager {
  private plugins: Map<string, QRGeneratorPlugin> = new Map();
  private config: PluginManagerConfig = {
    enabledPlugins: [],
    pluginSettings: {}
  };
  private storageKey = 'xympay_plugin_config';
  private eventListeners: Array<() => void> = [];
  constructor(config?: Partial<PluginManagerConfig>) {
    // ローカルストレージから設定を読み込み
    this.loadConfigFromStorage();
    
    // 初回訪問時（ローカルストレージがない）のみデフォルト設定を適用
    const hasStoredConfig = typeof window !== 'undefined' && localStorage.getItem(this.storageKey);
    
    if (config && !hasStoredConfig) {
      this.config = { ...this.config, ...config };
      this.saveConfigToStorage();
    } else if (config && hasStoredConfig) {
      // ストレージがある場合は上書きしない
      console.log('既存のプラグイン設定を使用します');
    }
  }

  /**
   * ローカルストレージから設定を読み込み
   */
  private loadConfigFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const storedConfig = JSON.parse(stored);
          this.config = { ...this.config, ...storedConfig };
        }
      } catch (error) {
        console.error('プラグイン設定の読み込みに失敗:', error);
      }
    }
  }
  /**
   * ローカルストレージに設定を保存
   */
  private saveConfigToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
        this.emitConfigChange();
      } catch (error) {
        console.error('プラグイン設定の保存に失敗:', error);
      }
    }
  }  /**
   * プラグインを登録
   */
  registerPlugin(plugin: QRGeneratorPlugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // 初回のみ、ローカルストレージに設定がない場合に自動有効化
    const hasStoredConfig = typeof window !== 'undefined' && localStorage.getItem(this.storageKey);
    
    if (!hasStoredConfig && !this.config.enabledPlugins.includes(plugin.id)) {
      // 初回訪問時のみ、デフォルトで有効化
      this.config.enabledPlugins.push(plugin.id);
      if (!this.config.defaultWalletId) {
        this.config.defaultWalletId = plugin.id;
      }
    }
  }

  /**
   * 複数のプラグインを一括登録
   */
  registerPlugins(plugins: QRGeneratorPlugin[]): void {
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  /**
   * 全てのプラグインを取得（有効/無効に関係なく）
   */
  getAllPlugins(): QRGeneratorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 利用可能なウォレット一覧を取得
   */
  getAvailableWallets(): Array<{ pluginId: string; wallet: any }> {
    return Array.from(this.plugins.values())
      .filter(plugin => this.config.enabledPlugins.includes(plugin.id))
      .map(plugin => ({
        pluginId: plugin.id,
        wallet: plugin.wallet
      }));
  }

  /**
   * 指定されたプラグインでQRコードを生成
   */
  async generateQRCode(
    pluginId: string,
    request: PaymentRequest,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`プラグイン '${pluginId}' が見つかりません`);
    }

    if (!this.config.enabledPlugins.includes(pluginId)) {
      throw new Error(`プラグイン '${pluginId}' は無効になっています`);
    }

    if (!plugin.canHandle(request)) {
      throw new Error(`プラグイン '${pluginId}' はこのリクエストを処理できません`);
    }

    const qrCode = await plugin.generateQR(request, options);
    const uri = plugin.generateUri(request);

    return {
      qrCode,
      uri,
      wallet: plugin.wallet,
      pluginId: plugin.id
    };
  }

  /**
   * デフォルトウォレットでQRコードを生成
   */
  async generateDefaultQRCode(
    request: PaymentRequest,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    const defaultPluginId = this.config.defaultWalletId || this.config.enabledPlugins[0];
    
    if (!defaultPluginId) {
      throw new Error('利用可能なプラグインがありません');
    }

    return this.generateQRCode(defaultPluginId, request, options);
  }

  /**
   * 自動選択：リクエストに最適なプラグインを選択してQRコード生成
   */
  async generateAutoQRCode(
    request: PaymentRequest,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    // 優先順位: デフォルト → 最初に対応可能なもの
    const enabledPlugins = this.config.enabledPlugins
      .map(id => this.plugins.get(id))
      .filter(Boolean) as QRGeneratorPlugin[];

    // デフォルトプラグインを優先
    if (this.config.defaultWalletId) {
      const defaultPlugin = this.plugins.get(this.config.defaultWalletId);
      if (defaultPlugin && defaultPlugin.canHandle(request)) {
        return this.generateQRCode(this.config.defaultWalletId, request, options);
      }
    }

    // その他のプラグインから選択
    for (const plugin of enabledPlugins) {
      if (plugin.canHandle(request)) {
        return this.generateQRCode(plugin.id, request, options);
      }
    }

    throw new Error('このリクエストを処理できるプラグインがありません');
  }
  /**
   * プラグインの設定を更新
   */
  updateConfig(config: Partial<PluginManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfigToStorage();
  }

  /**
   * プラグインを有効/無効にする
   */
  setPluginEnabled(pluginId: string, enabled: boolean): void {
    if (enabled) {
      if (!this.config.enabledPlugins.includes(pluginId)) {
        this.config.enabledPlugins.push(pluginId);
      }
    } else {
      this.config.enabledPlugins = this.config.enabledPlugins.filter(id => id !== pluginId);
    }
    this.saveConfigToStorage();
  }

  /**
   * デフォルトウォレットを設定
   */
  setDefaultWallet(pluginId: string): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`プラグイン '${pluginId}' が見つかりません`);
    }
    this.config.defaultWalletId = pluginId;
    this.saveConfigToStorage();
  }

  /**
   * プラグイン詳細情報を取得
   */
  getPlugin(pluginId: string): QRGeneratorPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * プラグインをテストする
   */
  async testPlugin(pluginId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return {
          success: false,
          message: `プラグイン '${pluginId}' が見つかりません`,
          error: 'PLUGIN_NOT_FOUND'
        };
      }

      // テスト用の決済リクエストを作成
      const testRequest: PaymentRequest = {
        recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
        amount: 100,
        message: 'テスト決済',
        paymentId: 'TEST1234'
      };

      // プラグインがリクエストを処理できるかチェック
      if (!plugin.canHandle(testRequest)) {
        return {
          success: false,
          message: 'このプラグインはテスト決済リクエストを処理できません',
          error: 'CANNOT_HANDLE_REQUEST'
        };
      }      // QRコードを生成（スマホテスト用に小さめのサイズも）
      const qrCodeData = await plugin.generateQR(testRequest, {
        width: 200,
        height: 200,
        margin: 4
      });

      // スマホテスト用の小さめQRコード
      const smallQrCodeData = await plugin.generateQR(testRequest, {
        width: 120,
        height: 120,
        margin: 2
      });

      // 結果を検証
      if (!qrCodeData || qrCodeData.length === 0) {
        return {
          success: false,
          message: 'QRコードの生成に失敗しました',
          error: 'QR_GENERATION_FAILED'
        };
      }

      // URIも生成してテスト
      const uri = plugin.generateUri(testRequest);

      return {
        success: true,
        message: 'テストが正常に完了しました',
        data: {
          qrCodeSize: qrCodeData.length,
          qrCode: qrCodeData,
          smallQrCode: smallQrCodeData,
          uri: uri,
          walletType: plugin.wallet.type,
          walletName: plugin.wallet.displayName
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: `テストの実行中にエラーが発生しました: ${error.message}`,
        error: 'TEST_EXECUTION_ERROR'
      };
    }
  }

  /**
   * ローカルストレージの設定をクリア（テスト用）
   */
  clearStoredConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      console.log('プラグイン設定をクリアしました');
    }
  }

  /**
   * デバッグ用：現在の設定を表示
   */
  debugConfig(): void {
    console.log('=== Plugin Manager Debug ===');
    console.log('Enabled plugins:', this.config.enabledPlugins);
    console.log('Default wallet:', this.config.defaultWalletId);
    console.log('Available wallets:', this.getAvailableWallets().map(w => w.pluginId));
    console.log('All registered plugins:', Array.from(this.plugins.keys()));
    console.log('Storage key:', this.storageKey);
    if (typeof window !== 'undefined') {
      console.log('LocalStorage value:', localStorage.getItem(this.storageKey));
    }
    console.log('=============================');
  }

  /**
   * 設定を取得
   */
  getConfig(): PluginManagerConfig {
    return { ...this.config };
  }

  /**
   * イベントリスナーを追加
   */
  addEventListener(listener: () => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * イベントリスナーを削除
   */
  removeEventListener(listener: () => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * イベントを発火
   */
  private emitConfigChange(): void {
    this.eventListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('イベントリスナーでエラー:', error);
      }
    });
  }
}
