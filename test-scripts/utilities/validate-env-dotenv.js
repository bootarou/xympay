require('dotenv').config()

console.log('=== .env ノード設定検証（dotenv使用）===\n')

// 環境変数の直接確認
console.log('🔍 現在の環境変数:')
console.log('SYMBOL_NODE_LOCAL_URL:', process.env.SYMBOL_NODE_LOCAL_URL || '(未設定)')
console.log('SYMBOL_NODE_LOCAL_TIMEOUT:', process.env.SYMBOL_NODE_LOCAL_TIMEOUT || '(未設定)')
console.log('SYMBOL_NODE_LOCAL_NAME:', process.env.SYMBOL_NODE_LOCAL_NAME || '(未設定)')

console.log('SYMBOL_NODE_PRIMARY_URL:', process.env.SYMBOL_NODE_PRIMARY_URL || '(未設定)')
console.log('SYMBOL_NODE_PRIMARY_NAME:', process.env.SYMBOL_NODE_PRIMARY_NAME || '(未設定)')
console.log('SYMBOL_NODE_PRIMARY_TIMEOUT:', process.env.SYMBOL_NODE_PRIMARY_TIMEOUT || '(未設定)')

console.log('SYMBOL_NODE_BACKUP1_URL:', process.env.SYMBOL_NODE_BACKUP1_URL || '(未設定)')
console.log('SYMBOL_NODE_BACKUP1_TIMEOUT:', process.env.SYMBOL_NODE_BACKUP1_TIMEOUT || '(未設定)')
console.log('SYMBOL_NODE_BACKUP1_NAME:', process.env.SYMBOL_NODE_BACKUP1_NAME || '(未設定)')

console.log('\n🔧 実際に設定されるノード構成:')

// 実際の設定値を再現
const nodes = [
  {
    name: 'ローカルノード (Priority 1)',
    url: process.env.SYMBOL_NODE_LOCAL_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.SYMBOL_NODE_LOCAL_TIMEOUT || '2000'),
    displayName: process.env.SYMBOL_NODE_LOCAL_NAME || 'Local Node',
    configured: !!process.env.SYMBOL_NODE_LOCAL_URL
  },
  {
    name: 'プライマリノード (Priority 2)',
    url: process.env.SYMBOL_NODE_PRIMARY_URL || 'https://sym-test-01.opening-line.jp:3001',
    timeout: parseInt(process.env.SYMBOL_NODE_PRIMARY_TIMEOUT || '5000'),
    displayName: process.env.SYMBOL_NODE_PRIMARY_NAME || 'Primary External',
    configured: !!process.env.SYMBOL_NODE_PRIMARY_URL
  },
  {
    name: 'バックアップ1ノード (Priority 3)',
    url: process.env.SYMBOL_NODE_BACKUP1_URL || 'https://001-sai-dual.symboltest.net:3001',
    timeout: parseInt(process.env.SYMBOL_NODE_BACKUP1_TIMEOUT || '5000'),
    displayName: process.env.SYMBOL_NODE_BACKUP1_NAME || 'Backup 1',
    configured: !!process.env.SYMBOL_NODE_BACKUP1_URL
  },
  {
    name: 'バックアップ2ノード (Priority 4)',
    url: process.env.SYMBOL_NODE_BACKUP2_URL || 'https://symboltest.nemtus.com:3001',
    timeout: parseInt(process.env.SYMBOL_NODE_BACKUP2_TIMEOUT || '5000'),
    displayName: process.env.SYMBOL_NODE_BACKUP2_NAME || 'Backup 2',
    configured: !!process.env.SYMBOL_NODE_BACKUP2_URL
  }
]

nodes.forEach((node, index) => {
  const status = node.configured ? '✅ 設定済み' : '⚙️  デフォルト'
  console.log(`${index + 1}. ${node.name} [${status}]`)
  console.log(`   URL: ${node.url}`)
  console.log(`   Timeout: ${node.timeout}ms`)
  console.log(`   Name: ${node.displayName}`)
  console.log('')
})

console.log('📋 .env設定の分析:')

const configuredCount = nodes.filter(n => n.configured).length
console.log(`  設定済みノード: ${configuredCount}/4`)
console.log(`  デフォルトノード: ${4 - configuredCount}/4`)

if (configuredCount === 0) {
  console.log('  💡 すべてデフォルト設定を使用中（問題ありません）')
} else if (configuredCount < 4) {
  console.log('  💡 一部カスタム設定、一部デフォルト（正常動作）')
} else {
  console.log('  ✅ すべてカスタム設定済み（推奨）')
}

// ローカルノード分析
console.log('\n🏠 ローカルノードについて:')
if (!process.env.SYMBOL_NODE_LOCAL_URL) {
  console.log('  ✅ ローカルノード未設定は正常です')
  console.log('  📝 理由: 本番環境では通常ローカルノードは使用しません')
  console.log('  🔄 フェイルオーバー: 他のノードが自動的に使用されます')
} else {
  console.log('  ⚙️  ローカルノードが設定されています')
  console.log(`  🔗 URL: ${process.env.SYMBOL_NODE_LOCAL_URL}`)
}

// 設定の妥当性チェック
console.log('\n🔍 設定の妥当性チェック:')
const issues = []

nodes.forEach((node, index) => {
  if (node.url && !node.url.startsWith('http')) {
    issues.push(`❌ ${node.name}: URLがhttp/httpsで始まっていません`)
  }
  if (node.timeout < 1000) {
    issues.push(`⚠️  ${node.name}: タイムアウトが短すぎます (${node.timeout}ms < 1000ms)`)
  }
  if (node.timeout > 30000) {
    issues.push(`⚠️  ${node.name}: タイムアウトが長すぎます (${node.timeout}ms > 30000ms)`)
  }
})

if (issues.length === 0) {
  console.log('  ✅ すべての設定が妥当です！')
} else {
  issues.forEach(issue => console.log(`  ${issue}`))
}
