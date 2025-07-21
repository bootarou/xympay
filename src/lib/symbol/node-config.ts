/**
 * Symbolマルチノード設定
 */

export interface SymbolNodeConfig {
  url: string
  priority: number // 1が最高優先度
  timeout: number // タイムアウト時間（ミリ秒）
  name?: string // ノード名（ログ用）
  region?: string // 地域（オプション）
}

export interface NodeHealthStatus {
  url: string
  isHealthy: boolean
  lastCheck: Date
  responseTime: number
  errorCount: number
  lastError?: string
}

/**
 * マルチノード設定
 * 優先度順にノードを定義（環境変数で上書き可能）
 */
export const SYMBOL_NODES: SymbolNodeConfig[] = [
  {
    url: process.env.SYMBOL_NODE_LOCAL_URL || 'http://localhost:3000',
    priority: 1,
    timeout: parseInt(process.env.SYMBOL_NODE_LOCAL_TIMEOUT || '2000'),
    name: process.env.SYMBOL_NODE_LOCAL_NAME || 'Local Node',
    region: process.env.SYMBOL_NODE_LOCAL_REGION || 'local'
  },
  {
    url: process.env.SYMBOL_NODE_PRIMARY_URL || 'https://sym-test-01.opening-line.jp:3001',
    priority: 2,
    timeout: parseInt(process.env.SYMBOL_NODE_PRIMARY_TIMEOUT || '5000'),
    name: process.env.SYMBOL_NODE_PRIMARY_NAME || 'Primary External',
    region: process.env.SYMBOL_NODE_PRIMARY_REGION || 'asia'
  },
  {
    url: process.env.SYMBOL_NODE_BACKUP1_URL || 'https://001-sai-dual.symboltest.net:3001',
    priority: 3,
    timeout: parseInt(process.env.SYMBOL_NODE_BACKUP1_TIMEOUT || '5000'),
    name: process.env.SYMBOL_NODE_BACKUP1_NAME || 'Backup 1',
    region: process.env.SYMBOL_NODE_BACKUP1_REGION || 'asia'
  },
  {
    url: process.env.SYMBOL_NODE_BACKUP2_URL || 'https://symboltest.nemtus.com:3001',
    priority: 4,
    timeout: parseInt(process.env.SYMBOL_NODE_BACKUP2_TIMEOUT || '5000'),
    name: process.env.SYMBOL_NODE_BACKUP2_NAME || 'Backup 2',
    region: process.env.SYMBOL_NODE_BACKUP2_REGION || 'asia'
  }
]

/**
 * フェイルオーバー設定
 */
export const FAILOVER_CONFIG = {
  maxRetries: 3, // ノードあたりの最大リトライ回数
  retryDelay: 1000, // リトライ間隔（ミリ秒）
  healthCheckInterval: 30000, // ヘルスチェック間隔（ミリ秒）
  circuitBreakerThreshold: 5, // 連続エラー閾値
  circuitBreakerRecoveryTime: 60000 // 回復待ち時間（ミリ秒）
}

/**
 * 優先度順にソートされたノードリストを取得（デフォルト設定）
 */
export function getSortedNodes(): SymbolNodeConfig[] {
  return [...SYMBOL_NODES].sort((a, b) => a.priority - b.priority)
}

/**
 * ローカルノードが利用可能かチェック
 */
export function hasLocalNode(): boolean {
  return SYMBOL_NODES.some(node => 
    node.url.includes('localhost') || node.url.includes('127.0.0.1')
  )
}

/**
 * 環境変数からノード設定を取得（追加ノードもサポート）
 */
export function getNodeConfig(): SymbolNodeConfig[] {
  const nodes = [...SYMBOL_NODES]
  
  // 追加のカスタムノードをサポート（priority 5以降）
  let customPriority = 5
  
  // SYMBOL_CUSTOM_NODE_URL_1, SYMBOL_CUSTOM_NODE_URL_2 などをサポート
  for (let i = 1; i <= 10; i++) {
    const customNodeUrl = process.env[`SYMBOL_CUSTOM_NODE_URL_${i}`]
    if (customNodeUrl) {
      nodes.push({
        url: customNodeUrl,
        priority: customPriority++,
        timeout: parseInt(process.env[`SYMBOL_CUSTOM_NODE_TIMEOUT_${i}`] || '5000'),
        name: process.env[`SYMBOL_CUSTOM_NODE_NAME_${i}`] || `Custom Node ${i}`,
        region: process.env[`SYMBOL_CUSTOM_NODE_REGION_${i}`] || 'unknown'
      })
    }
  }
  
  // 旧形式のSYMBOL_CUSTOM_NODE_URLも引き続きサポート
  const legacyCustomNodeUrl = process.env.SYMBOL_CUSTOM_NODE_URL
  if (legacyCustomNodeUrl && !nodes.some(node => node.url === legacyCustomNodeUrl)) {
    nodes.push({
      url: legacyCustomNodeUrl,
      priority: 99, // 最低優先度
      timeout: parseInt(process.env.SYMBOL_CUSTOM_NODE_TIMEOUT || '5000'),
      name: process.env.SYMBOL_CUSTOM_NODE_NAME || 'Legacy Custom Node',
      region: process.env.SYMBOL_CUSTOM_NODE_REGION || 'unknown'
    })
  }
    return getSortedNodeList(nodes)
}

/**
 * 指定されたノードリストを優先度順にソート
 */
function getSortedNodeList(nodeList: SymbolNodeConfig[]): SymbolNodeConfig[] {
  return [...nodeList].sort((a, b) => a.priority - b.priority)
}
