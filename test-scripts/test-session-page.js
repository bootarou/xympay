const crypto = require('crypto')

// テスト用決済ID
const paymentId = 'test-1752928228403'

// セッションキーを生成
const sessionKey = crypto.randomBytes(16).toString('hex')

// セッションデータを準備
const sessionData = {
  paymentId: paymentId,
  timestamp: Date.now()
}

console.log('=== セッションページテスト情報 ===')
console.log('決済ID:', paymentId)
console.log('セッションキー:', sessionKey)
console.log('セッションデータ:', JSON.stringify(sessionData, null, 2))
console.log()
console.log('テスト手順:')
console.log('1. ブラウザでこのURLにアクセス:')
console.log(`   http://localhost:3000/payment/session/${sessionKey}`)
console.log()
console.log('2. ブラウザの開発者ツールのConsoleでこのコードを実行:')
console.log(`   sessionStorage.setItem('${sessionKey}', '${JSON.stringify(sessionData)}')`)
console.log()
console.log('3. ページをリロードして決済セッションページをテスト')
console.log()
console.log('💡 または、決済ページから「新しいタブで開く」などでセッションページにアクセス')
