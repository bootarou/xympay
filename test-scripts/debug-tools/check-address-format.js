const fetch = require('node-fetch')

async function checkAddressFormat() {
  console.log('=== アドレス形式調査 ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const friendlyAddress = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY' // Pretty形式
  const hexAddress = '98ADF6C8073ED934056D9384EB680EBC2ECA500515CEC7AB' // Hex形式
  
  try {
    console.log('フレンドリーアドレス:', friendlyAddress)
    console.log('ヘックスアドレス:', hexAddress)
    
    // 各形式でトランザクション検索
    console.log('\n1. フレンドリーアドレスで検索...')
    const friendlyResponse = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${friendlyAddress}&pageSize=5`)
    if (friendlyResponse.ok) {
      const friendlyData = await friendlyResponse.json()
      console.log('✅ フレンドリーアドレス検索成功')
      console.log('   トランザクション数:', friendlyData.data?.length || 0)
    } else {
      console.log('❌ フレンドリーアドレス検索失敗:', friendlyResponse.status)
    }
    
    console.log('\n2. ヘックスアドレスで検索...')
    const hexResponse = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${hexAddress}&pageSize=5`)
    if (hexResponse.ok) {
      const hexData = await hexResponse.json()
      console.log('✅ ヘックスアドレス検索成功')
      console.log('   トランザクション数:', hexData.data?.length || 0)
    } else {
      console.log('❌ ヘックスアドレス検索失敗:', hexResponse.status)
    }
    
    // 両方で検索して結果を比較
    console.log('\n3. 最新トランザクションの詳細比較...')
    if (friendlyResponse.ok && hexResponse.ok) {
      const friendlyData = await friendlyResponse.json()
      const hexData = await hexResponse.json()
      
      if (friendlyData.data?.length > 0) {
        const friendlyTx = friendlyData.data[0]
        console.log('フレンドリー検索の最新Tx:')
        console.log('  Hash:', friendlyTx.meta?.hash?.substring(0, 16) + '...')
        console.log('  Amount:', friendlyTx.transaction?.mosaics?.[0]?.amount)
        console.log('  Message:', friendlyTx.transaction?.message)
      }
      
      if (hexData.data?.length > 0) {
        const hexTx = hexData.data[0]
        console.log('ヘックス検索の最新Tx:')
        console.log('  Hash:', hexTx.meta?.hash?.substring(0, 16) + '...')
        console.log('  Amount:', hexTx.transaction?.mosaics?.[0]?.amount)
        console.log('  Message:', hexTx.transaction?.message)
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

checkAddressFormat()
