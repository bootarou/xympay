export * from './types';
export * from './manager';
export * from './symbol-plugins';
export * from './custom';

import { QRPluginManager } from './manager';
import { SymbolMobilePlugin, SymbolDesktopPlugin, SymbolStandardPlugin } from './symbol-plugins';
import { customPlugins } from './custom';

/**
 * デフォルトのプラグインマネージャーインスタンスを作成
 */
export function createDefaultPluginManager(): QRPluginManager {
  // ローカルストレージから設定を読み込み、デフォルト設定は控えめにする
  const manager = new QRPluginManager();

  // デフォルトプラグインを登録
  manager.registerPlugins([
    new SymbolMobilePlugin(),
    new SymbolDesktopPlugin(),
    new SymbolStandardPlugin(),
    ...customPlugins  // カスタムプラグインを追加
  ]);

  return manager;
}

/**
 * グローバルプラグインマネージャーインスタンス
 */
export const qrPluginManager = createDefaultPluginManager();
