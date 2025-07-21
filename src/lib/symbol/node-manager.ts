/**
 * Symbolノード管理クラス
 * マルチノード構成でのフェイルオーバーとヘルスチェックを管理
 */

import { RepositoryFactoryHttp } from 'symbol-sdk'
import { 
  FAILOVER_CONFIG, 
  SymbolNodeConfig, 
  NodeHealthStatus,
  getNodeConfig 
} from './node-config'

export class SymbolNodeManager {
  private nodeHealth: Map<string, NodeHealthStatus> = new Map()
  private currentNodeIndex: number = 0
  private circuitBreakers: Map<string, number> = new Map() // エラー回数追跡
  private healthCheckTimer?: NodeJS.Timeout

  constructor() {
    this.initializeNodeHealth()
    this.startHealthCheck()
  }
  /**
   * ノードヘルス状態の初期化
   */
  private initializeNodeHealth(): void {
    getNodeConfig().forEach(node => {
      this.nodeHealth.set(node.url, {
        url: node.url,
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: 0,
        errorCount: 0
      })
      this.circuitBreakers.set(node.url, 0)
    })
  }

  /**
   * 利用可能なノードを取得（優先度順、ヘルス状態考慮）
   */  getAvailableNode(): SymbolNodeConfig | null {
    const sortedNodes = getNodeConfig()
      // 最優先で健全なノードを探す
    for (const node of sortedNodes) {
      const health = this.nodeHealth.get(node.url)
      const errorCount = this.circuitBreakers.get(node.url) || 0
      
      if (health?.isHealthy && errorCount < FAILOVER_CONFIG.circuitBreakerThreshold) {
        return node
      }
    }
    
    // 全ノードが不健全な場合、最優先ノードを返す（強制実行）
    console.warn('⚠️ 全ノードが不健全です。最優先ノードで強制実行します')
    return sortedNodes[0] || null
  }

  /**
   * 指定ノードでRepositoryFactoryを作成
   */
  createRepositoryFactory(node: SymbolNodeConfig): RepositoryFactoryHttp {
    return new RepositoryFactoryHttp(node.url)
  }

  /**
   * ノード操作を実行（自動フェイルオーバー付き）
   */
  async executeWithFailover<T>(
    operation: (repositoryFactory: RepositoryFactoryHttp, node: SymbolNodeConfig) => Promise<T>
  ): Promise<T> {    const sortedNodes = getNodeConfig()
    let lastError: Error | null = null
    
    for (const node of sortedNodes) {
      const errorCount = this.circuitBreakers.get(node.url) || 0

      // サーキットブレーカーチェック
      if (errorCount >= FAILOVER_CONFIG.circuitBreakerThreshold) {
        console.log(`🚫 サーキットブレーカー: ${node.name || node.url} をスキップ`)
        continue
      }

      try {
        console.log(`🔄 ノード試行: ${node.name || node.url}`)
        const startTime = Date.now()
        
        const repositoryFactory = this.createRepositoryFactory(node)
        const result = await Promise.race([
          operation(repositoryFactory, node),
          this.createTimeoutPromise(node.timeout)
        ])
        
        const responseTime = Date.now() - startTime
        
        // 成功時の処理
        this.recordSuccess(node.url, responseTime)
        console.log(`✅ ノード成功: ${node.name || node.url} (${responseTime}ms)`)
        
        return result as T
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`❌ ノード失敗: ${node.name || node.url} - ${lastError.message}`)
        
        this.recordError(node.url, lastError.message)
        
        // 次のノードを試行
        continue
      }
    }

    // 全ノード失敗
    throw new Error(`全Symbolノードで操作が失敗しました: ${lastError?.message}`)
  }

  /**
   * タイムアウトPromiseを作成
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`タイムアウト: ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * ノード成功を記録
   */
  private recordSuccess(nodeUrl: string, responseTime: number): void {
    const health = this.nodeHealth.get(nodeUrl)
    if (health) {
      health.isHealthy = true
      health.lastCheck = new Date()
      health.responseTime = responseTime
      health.errorCount = 0
      health.lastError = undefined
    }
    
    // サーキットブレーカーをリセット
    this.circuitBreakers.set(nodeUrl, 0)
  }

  /**
   * ノードエラーを記録
   */
  private recordError(nodeUrl: string, errorMessage: string): void {
    const health = this.nodeHealth.get(nodeUrl)
    if (health) {
      health.isHealthy = false
      health.lastCheck = new Date()
      health.errorCount++
      health.lastError = errorMessage
    }
    
    // サーキットブレーカーのエラー回数を増加
    const currentErrors = this.circuitBreakers.get(nodeUrl) || 0
    this.circuitBreakers.set(nodeUrl, currentErrors + 1)
  }

  /**
   * 定期ヘルスチェック開始
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck()
    }, FAILOVER_CONFIG.healthCheckInterval)
  }

  /**
   * ヘルスチェック実行
   */  private async performHealthCheck(): Promise<void> {
    console.log('🔍 Symbolノードヘルスチェック開始')
    
    const sortedNodes = getNodeConfig()
    const healthCheckPromises = sortedNodes.map(node => this.checkSingleNode(node))
    
    await Promise.allSettled(healthCheckPromises)
    
    // ヘルス状況をログ出力
    this.logHealthStatus()
  }

  /**
   * 単一ノードのヘルスチェック
   */
  private async checkSingleNode(node: SymbolNodeConfig): Promise<void> {
    try {
      const startTime = Date.now()
      const repositoryFactory = this.createRepositoryFactory(node)
      const networkRepository = repositoryFactory.createNetworkRepository()
      
      await Promise.race([
        networkRepository.getNetworkType().toPromise(),
        this.createTimeoutPromise(node.timeout)
      ])
      
      const responseTime = Date.now() - startTime
      this.recordSuccess(node.url, responseTime)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.recordError(node.url, errorMessage)
    }
  }

  /**
   * ヘルス状況をログ出力
   */
  private logHealthStatus(): void {
    console.log('📊 Symbolノードヘルス状況:')
      this.nodeHealth.forEach((health, url) => {
      const node = getNodeConfig().find(n => n.url === url)
      const errorCount = this.circuitBreakers.get(url) || 0
      
      console.log(`  ${health.isHealthy ? '✅' : '❌'} ${node?.name || url}`)
      console.log(`     応答時間: ${health.responseTime}ms, エラー数: ${errorCount}`)
      if (health.lastError) {
        console.log(`     最新エラー: ${health.lastError}`)
      }
    })
  }

  /**
   * ヘルス状況を取得
   */
  getHealthStatus(): NodeHealthStatus[] {
    return Array.from(this.nodeHealth.values())
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    const totalNodes = this.nodeHealth.size
    const healthyNodes = Array.from(this.nodeHealth.values()).filter(h => h.isHealthy).length
    const totalErrors = Array.from(this.circuitBreakers.values()).reduce((sum, count) => sum + count, 0)
    
    return {
      totalNodes,
      healthyNodes,
      unhealthyNodes: totalNodes - healthyNodes,
      totalErrors,
      uptime: healthyNodes / totalNodes
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
  }
}

// シングルトンインスタンス
export const symbolNodeManager = new SymbolNodeManager()

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  symbolNodeManager.destroy()
})

process.on('SIGTERM', () => {
  symbolNodeManager.destroy()
})
