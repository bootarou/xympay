import { getNodeConfig, SYMBOL_NODES } from './src/lib/symbol/node-config'

console.log('=== Symbolマルチノード設定テスト ===\n')

// 1. デフォルト設定の表示
console.log('📋 デフォルト設定:')
SYMBOL_NODES.forEach((node, index) => {
  console.log(`  ${index + 1}. ${node.name} (Priority ${node.priority})`)
  console.log(`     URL: ${node.url}`)
  console.log(`     Timeout: ${node.timeout}ms`)
  console.log(`     Region: ${node.region}`)
  console.log('')
})

// 2. 環境変数適用後の設定表示
console.log('🔧 環境変数適用後の設定:')
const finalConfig = getNodeConfig()
finalConfig.forEach((node, index) => {
  console.log(`  ${index + 1}. ${node.name} (Priority ${node.priority})`)
  console.log(`     URL: ${node.url}`)
  console.log(`     Timeout: ${node.timeout}ms`)
  console.log(`     Region: ${node.region}`)
  console.log('')
})

// 3. 設定例の表示
console.log('💡 環境変数設定例:')
console.log(`
# プライマリノードを変更する場合
SYMBOL_NODE_PRIMARY_URL=https://your-custom-primary.com:3001
SYMBOL_NODE_PRIMARY_NAME=Custom Primary Node

# 追加ノードを設定する場合
SYMBOL_CUSTOM_NODE_URL_1=https://additional-node-1.com:3001
SYMBOL_CUSTOM_NODE_NAME_1=Additional Node 1
SYMBOL_CUSTOM_NODE_REGION_1=europe
`)

console.log('✅ マルチノード設定が正常に読み込まれました！')
