const fetch = require('node-fetch')

async function quickSymbolTest() {
  console.log('=== 簡単なSymbol APIテスト ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY' // テストアドレス
  
  try {
    console.log('ノードURL:', nodeUrl)
    console.log('テストアドレス:', address)
    
    // ノード情報取得
    console.log('\n1. ノード接続テスト...')
    const nodeResponse = await fetch(`${nodeUrl}/node/info`, { timeout: 10000 })
    if (nodeResponse.ok) {
      const nodeInfo = await nodeResponse.json()
      console.log('✅ ノード接続成功')
      console.log('   バージョン:', nodeInfo.version)
    } else {
      console.log('❌ ノード接続失敗:', nodeResponse.status)
      return
    }
    
    // アカウント情報取得
    console.log('\n2. アカウント情報取得...')
    const accountResponse = await fetch(`${nodeUrl}/accounts/${address}`, { timeout: 10000 })
    if (accountResponse.ok) {
      const accountInfo = await accountResponse.json()
      console.log('✅ アカウント存在確認')
      console.log('   アドレス:', accountInfo.account.address)
      console.log('   モザイク数:', accountInfo.account.mosaics?.length || 0)
    } else if (accountResponse.status === 404) {
      console.log('⚠️  アカウント未使用（まだトランザクションなし）')
    } else {
      console.log('❌ アカウント取得エラー:', accountResponse.status)
    }
    
    // トランザクション検索（受信）
    console.log('\n3. 受信トランザクション検索...')
    const txResponse = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=10`, { timeout: 15000 })
    if (txResponse.ok) {
      const txData = await txResponse.json()
      console.log('✅ トランザクション検索成功')
      console.log('   受信トランザクション数:', txData.data?.length || 0)
      
      if (txData.data && txData.data.length > 0) {
        console.log('\n   📋 最新の受信トランザクション:')
        const latestTx = txData.data[0]
        console.log('     ID:', latestTx.meta?.id)
        console.log('     Hash:', latestTx.meta?.hash?.substring(0, 16) + '...')
        console.log('     タイムスタンプ:', latestTx.meta?.timestamp)
        console.log('     送信者:', latestTx.transaction?.signerPublicKey?.substring(0, 16) + '...')
        console.log('     受信者:', latestTx.transaction?.recipientAddress)
        
        if (latestTx.transaction?.mosaics) {
          console.log('     モザイク:', latestTx.transaction.mosaics.map(m => `${m.amount} (${m.id})`))
        }
        
        if (latestTx.transaction?.message) {
          console.log('     メッセージ:', latestTx.transaction.message)
        }
      }
    } else {
      console.log('❌ トランザクション検索失敗:', txResponse.status)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

quickSymbolTest()
