import { symbolNodeManager } from './src/lib/symbol/node-manager'
import { SymbolMonitor } from './src/lib/symbol/monitor'

async function testMultiNodeSetup() {
  try {
    console.log('=== マルチノード構成テスト開始 ===\n')
    
    // 1. ノード管理状況を表示
    console.log('📊 ノード管理状況:')
    const healthStatus = symbolNodeManager.getHealthStatus()
    healthStatus.forEach(status => {
      console.log(`  ${status.isHealthy ? '✅' : '❌'} ${status.url}`)
      console.log(`     最終チェック: ${status.lastCheck.toISOString()}`)
      console.log(`     応答時間: ${status.responseTime}ms`)
      console.log(`     エラー数: ${status.errorCount}`)
      if (status.lastError) {
        console.log(`     最新エラー: ${status.lastError}`)
      }
      console.log('')
    })
    
    // 2. 統計情報を表示
    console.log('📈 統計情報:')
    const stats = symbolNodeManager.getStatistics()
    console.log(`  総ノード数: ${stats.totalNodes}`)
    console.log(`  健全ノード数: ${stats.healthyNodes}`)
    console.log(`  不健全ノード数: ${stats.unhealthyNodes}`)
    console.log(`  総エラー数: ${stats.totalErrors}`)
    console.log(`  稼働率: ${(stats.uptime * 100).toFixed(1)}%\n`)
    
    // 3. 利用可能ノードを確認
    console.log('🔍 利用可能ノード:')
    const availableNode = symbolNodeManager.getAvailableNode()
    if (availableNode) {
      console.log(`  選択されたノード: ${availableNode.name || availableNode.url}`)
      console.log(`  優先度: ${availableNode.priority}`)
      console.log(`  タイムアウト: ${availableNode.timeout}ms\n`)
    } else {
      console.log('  ❌ 利用可能なノードがありません\n')
    }
    
    // 4. Symbol監視クラスの接続テスト
    console.log('🔗 Symbol監視クラス接続テスト:')
    const symbolMonitor = new SymbolMonitor()
    const connectionResult = await symbolMonitor.testConnection()
    console.log(`  接続結果: ${connectionResult ? '✅ 成功' : '❌ 失敗'}\n`)
    
    // 5. フェイルオーバーテスト（実際のトランザクション検索）
    console.log('🔄 フェイルオーバーテスト:')
    console.log('  テスト用アドレスでトランザクション検索を実行...')
    
    try {
      const testAddress = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
      const result = await symbolMonitor.checkConfirmedTransactions(
        testAddress,
        'TEST_MESSAGE',
        1000000
      )
      
      console.log(`  検索結果: ${result ? '取引発見' : '取引なし'}`)
      if (result) {
        console.log(`  取引ID: ${result.transactionId}`)
        console.log(`  送信者: ${result.senderAddress}`)
        console.log(`  金額: ${result.amount}`)
        console.log(`  メッセージ: ${result.message}`)
      }
      
    } catch (error) {
      console.log(`  ❌ 検索エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    console.log('\n=== マルチノード構成テスト完了 ===')
    
    // 6. 最終的なヘルス状況を表示
    console.log('\n📊 最終ヘルス状況:')
    symbolNodeManager.getHealthStatus().forEach(status => {
      console.log(`  ${status.isHealthy ? '✅' : '❌'} ${status.url} (${status.responseTime}ms)`)
    })
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error)
  } finally {
    // クリーンアップ
    symbolNodeManager.destroy()
    console.log('\n🧹 リソースをクリーンアップしました')
  }
}

// ヘルスチェック状況の定期表示
const healthMonitor = setInterval(() => {
  console.log('\n⏰ 定期ヘルスチェック:')
  const stats = symbolNodeManager.getStatistics()
  console.log(`  稼働率: ${(stats.uptime * 100).toFixed(1)}% (${stats.healthyNodes}/${stats.totalNodes})`)
}, 10000)

// テスト実行
testMultiNodeSetup().then(() => {
  clearInterval(healthMonitor)
  process.exit(0)
}).catch(error => {
  clearInterval(healthMonitor)
  console.error('Fatal error:', error)
  process.exit(1)
})
