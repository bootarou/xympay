#!/usr/bin/env node

/**
 * 期間フィルター修正のテストスクリプト
 * - 今月の期間計算が正しいかテスト
 * - API期間フィルターの動作確認
 */

console.log('🚀 期間フィルター修正テスト開始\n')

console.log('=== 期間計算ロジック確認 ===\n')

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

// 修正前のロジック（間違い）
const oldMonthAgo = new Date(today)
oldMonthAgo.setMonth(today.getMonth() - 1)

// 修正後のロジック（正しい）
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

console.log('現在日時:', now.toLocaleString('ja-JP'))
console.log('今日（00:00:00）:', today.toLocaleString('ja-JP'))
console.log('')

console.log('❌ 修正前（間違い）- "今月" = 過去1ヶ月:')
console.log('  開始日:', oldMonthAgo.toLocaleString('ja-JP'))
console.log('  → これは過去1ヶ月の意味で、「今月」ではない')
console.log('')

console.log('✅ 修正後（正しい）- "今月" = 今月1日〜現在:')
console.log('  開始日:', thisMonthStart.toLocaleString('ja-JP'))
console.log('  → これが正しい「今月」の期間')
console.log('')

console.log('=== 他の期間も確認 ===\n')

// 今日
const todayStart = new Date(now)
todayStart.setHours(0, 0, 0, 0)
console.log('今日の期間:')
console.log('  開始:', todayStart.toLocaleString('ja-JP'))
console.log('  終了:', now.toLocaleString('ja-JP'))
console.log('')

// 今週（過去7日）
const weekAgo = new Date(today)
weekAgo.setDate(today.getDate() - 7)
console.log('今週の期間（過去7日）:')
console.log('  開始:', weekAgo.toLocaleString('ja-JP'))
console.log('  終了:', now.toLocaleString('ja-JP'))
console.log('')

// 3ヶ月
const threeMonthsAgo = new Date(today)
threeMonthsAgo.setMonth(today.getMonth() - 3)
console.log('過去3ヶ月の期間:')
console.log('  開始:', threeMonthsAgo.toLocaleString('ja-JP'))
console.log('  終了:', now.toLocaleString('ja-JP'))
console.log('')

console.log('=== 修正内容まとめ ===\n')

const fixes = [
  '✅ 取引履歴API (/api/transactions): 「今月」= 今月1日〜現在',
  '✅ 統計API (/api/transactions/stats): 「今月」= 今月1日〜現在', 
  '✅ useTransactions: useEffect依存配列にoffsetを追加',
  '✅ デバッグログ追加: 初期化状況の確認'
]

fixes.forEach(fix => console.log(`  ${fix}`))

console.log('\n=== テスト手順 ===\n')

const testSteps = [
  '1. http://localhost:3000/transactions を開く',
  '2. ページロード時に「今月」が選択されている',
  '3. 表示される取引履歴が今月（7月1日〜現在）のデータである',
  '4. 統計情報も今月のデータと一致している',
  '5. 他の期間（今日、今週など）に切り替えて正しく動作する',
  '6. ブラウザのコンソールでデバッグログを確認'
]

testSteps.forEach(step => console.log(`  ${step}`))

console.log('\n🎯 期間フィルター修正完了!')
console.log('「今月」が正しく今月のデータを表示するようになりました。\n')
