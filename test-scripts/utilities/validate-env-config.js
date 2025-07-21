console.log('=== .env ノード設定検証 ===\n')

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

console.log('\n🔧 実際に設定されるノード構成:')

// 実際の設定値を再現
const localUrl = process.env.SYMBOL_NODE_LOCAL_URL || 'http://localhost:3000'
const localTimeout = parseInt(process.env.SYMBOL_NODE_LOCAL_TIMEOUT || '2000')
const localName = process.env.SYMBOL_NODE_LOCAL_NAME || 'Local Node'

const primaryUrl = process.env.SYMBOL_NODE_PRIMARY_URL || 'https://sym-test-01.opening-line.jp:3001'
const primaryTimeout = parseInt(process.env.SYMBOL_NODE_PRIMARY_TIMEOUT || '5000')
const primaryName = process.env.SYMBOL_NODE_PRIMARY_NAME || 'Primary External'

const backup1Url = process.env.SYMBOL_NODE_BACKUP1_URL || 'https://001-sai-dual.symboltest.net:3001'
const backup1Timeout = parseInt(process.env.SYMBOL_NODE_BACKUP1_TIMEOUT || '5000')
const backup1Name = process.env.SYMBOL_NODE_BACKUP1_NAME || 'Backup 1'

console.log(`1. ローカルノード (Priority 1):`)
console.log(`   URL: ${localUrl}`)
console.log(`   Timeout: ${localTimeout}ms`)
console.log(`   Name: ${localName}`)

console.log(`2. プライマリノード (Priority 2):`)
console.log(`   URL: ${primaryUrl}`)
console.log(`   Timeout: ${primaryTimeout}ms`)
console.log(`   Name: ${primaryName}`)

console.log(`3. バックアップ1ノード (Priority 3):`)
console.log(`   URL: ${backup1Url}`)
console.log(`   Timeout: ${backup1Timeout}ms`)
console.log(`   Name: ${backup1Name}`)

console.log('\n📋 .env設定の問題点チェック:')

// 問題点をチェック
const issues = []

if (!process.env.SYMBOL_NODE_LOCAL_URL) {
  issues.push('⚠️  ローカルノード未設定 - デフォルト(localhost:3000)を使用')
}

if (process.env.SYMBOL_NODE_PRIMARY_NAME && !process.env.SYMBOL_NODE_PRIMARY_NAME.includes('"')) {
  issues.push('💡 SYMBOL_NODE_PRIMARY_NAME: クォートなしでも問題ありません')
}

if (process.env.SYMBOL_NODE_BACKUP1_TIMEOUT && !process.env.SYMBOL_NODE_BACKUP1_NAME) {
  issues.push('📝 SYMBOL_NODE_BACKUP1_NAME が未設定です')
}

if (issues.length === 0) {
  console.log('✅ 設定に問題はありません！')
} else {
  issues.forEach(issue => console.log(`   ${issue}`))
}

console.log('\n🚀 推奨される .env 設定:')
console.log(`
# ローカルノード（開発環境のみ）
# SYMBOL_NODE_LOCAL_URL=http://localhost:3000
# SYMBOL_NODE_LOCAL_TIMEOUT=2000
# SYMBOL_NODE_LOCAL_NAME="Local Development Node"

# プライマリノード
SYMBOL_NODE_PRIMARY_URL="https://sym-test-01.opening-line.jp:3001"
SYMBOL_NODE_PRIMARY_NAME="My Primary Node"
SYMBOL_NODE_PRIMARY_TIMEOUT=5000

# バックアップノード1
SYMBOL_NODE_BACKUP1_URL="https://001-sai-dual.symboltest.net:3001"
SYMBOL_NODE_BACKUP1_NAME="Backup Node 1"
SYMBOL_NODE_BACKUP1_TIMEOUT=3000
`)
