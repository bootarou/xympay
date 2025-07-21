/**
 * カスタムウォレットプラグインのインデックスファイル
 * 
 * このファイルでは、カスタム開発されたウォレットプラグインを
 * 一箇所でエクスポートし、管理します。
 */

// プラグインのインポート
export { MyWalletPlugin, myWalletPlugin } from './my-wallet-plugin';
export { AdvancedWalletPlugin, advancedWalletPlugin } from './advanced-wallet-plugin';
export { TestWalletPlugin, testWalletPlugin } from './test-wallet-plugin';
export { NFTDriveExTestNetPlugin, nftdriveExTestNetPlugin } from './nftdrive-ex-testnet';
// 設定コンポーネントのインポート
export { MyWalletConfig } from './my-wallet-config';

// 型定義のインポート
import { QRGeneratorPlugin } from '../types';

// カスタムプラグインの一覧
import { nftdriveExTestNetPlugin } from './nftdrive-ex-testnet';
import { myWalletPlugin } from './my-wallet-plugin';
import { advancedWalletPlugin } from './advanced-wallet-plugin';
import { testWalletPlugin } from './test-wallet-plugin';


/**
 * すべてのカスタムプラグインの配列
 */
export const customPlugins: QRGeneratorPlugin[] = [
  nftdriveExTestNetPlugin,    
  myWalletPlugin,
  advancedWalletPlugin,
  testWalletPlugin
];

/**
 * 本番環境用のカスタムプラグイン
 * （テスト用プラグインを除外）
 */
export const productionCustomPlugins: QRGeneratorPlugin[] = [
  myWalletPlugin,
  advancedWalletPlugin
];

/**
 * 開発環境用のカスタムプラグイン
 * （すべてのプラグインを含む）
 */
export const developmentCustomPlugins: QRGeneratorPlugin[] = [
  nftdriveExTestNetPlugin ,
  myWalletPlugin,
  advancedWalletPlugin,
  testWalletPlugin

];

/**
 * プラグインカテゴリの定義
 */
export const pluginCategories = {
  basic: [myWalletPlugin],
  advanced: [advancedWalletPlugin],
  testing: [testWalletPlugin, nftdriveExTestNetPlugin]
};

/**
 * カスタムプラグインの情報
 */
export const customPluginInfo = {
  totalCount: customPlugins.length,
  categories: Object.keys(pluginCategories),
  plugins: customPlugins.map(plugin => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    type: plugin.wallet.type,
    description: plugin.description
  }))
};

/**
 * 環境に応じてカスタムプラグインを取得
 */
export function getCustomPluginsForEnvironment(): QRGeneratorPlugin[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('📦 Loading development custom plugins:', developmentCustomPlugins.length);
    return developmentCustomPlugins;
  } else {
    console.log('📦 Loading production custom plugins:', productionCustomPlugins.length);
    return productionCustomPlugins;
  }
}

/**
 * カスタムプラグインの初期化
 */
export function initializeCustomPlugins(): void {
  console.log('🚀 Initializing custom wallet plugins...');
  
  customPlugins.forEach(plugin => {
    console.log(`✅ Loaded plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
  });
  
  console.log(`📊 Total custom plugins loaded: ${customPlugins.length}`);
}

/**
 * カスタムプラグインのヘルスチェック
 */
export async function checkCustomPluginsHealth(): Promise<{ [key: string]: any }> {
  console.log('🏥 Checking custom plugins health...');
  
  const healthResults: { [key: string]: any } = {};
  
  for (const plugin of customPlugins) {
    try {
      // プラグインにhealthCheckメソッドがある場合は実行
      if ('healthCheck' in plugin && typeof plugin.healthCheck === 'function') {
        const result = await plugin.healthCheck();
        healthResults[plugin.id] = result;
        console.log(`✅ ${plugin.name}: ${result.healthy ? 'Healthy' : 'Unhealthy'}`);
      } else {
        // 基本的な動作確認
        const canHandle = plugin.canHandle({
          recipientAddress: 'TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY',
          amount: 1000000,
          paymentId: 'HEALTH01'
        });
        
        healthResults[plugin.id] = {
          healthy: canHandle,
          details: canHandle ? 'Basic check passed' : 'Basic check failed'
        };
        
        console.log(`✅ ${plugin.name}: ${canHandle ? 'Basic check passed' : 'Basic check failed'}`);
      }
    } catch (error) {
      healthResults[plugin.id] = {
        healthy: false,
        details: error.message
      };
      console.error(`❌ ${plugin.name}: Health check failed -`, error.message);
    }
  }
  
  return healthResults;
}

/**
 * デバッグ情報の取得
 */
export function getCustomPluginsDebugInfo(): any {
  return {
    environment: process.env.NODE_ENV,
    totalPlugins: customPlugins.length,
    loadedPlugins: customPlugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      walletType: plugin.wallet.type,
      supported: plugin.wallet.supported
    })),
    categories: pluginCategories,
    timestamp: new Date().toISOString()
  };
}
