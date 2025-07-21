import { qrPluginManager } from './symbol/plugins'

// プラグインマネージャーの初期化
export function initializePluginManager() {
  console.log('QRプラグインマネージャーを初期化中...')
  
  const availableWallets = qrPluginManager.getAvailableWallets()
  console.log('利用可能なウォレット:', availableWallets.map(w => w.wallet.displayName))
  
  // デフォルトウォレットの設定確認
  const config = qrPluginManager.getConfig()
  console.log('プラグインマネージャー設定:', config)
  
  return qrPluginManager
}

// アプリ起動時にプラグインマネージャーを初期化
if (typeof window !== 'undefined') {
  initializePluginManager()
}

export { qrPluginManager }
