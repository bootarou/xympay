async function testFinalConfiguration() {
  try {
    console.log('=== 最終設定テスト ===')
    console.log('')
    
    // 1. .env設定確認
    const nodeUrl = process.env.SYMBOL_NODE_URL || 'https://sym-test-01.opening-line.jp:3001'
    console.log('Symbol ノードURL:', nodeUrl)
    
    // 2. ノード接続テスト
    console.log('ノード接続テスト中...')
    const response = await fetch(`${nodeUrl}/node/info`)
    if (response.ok) {
      const nodeInfo = await response.json()
      console.log('✅ ノード接続成功:', nodeInfo.friendlyName)
    } else {
      console.log('❌ ノード接続失敗:', response.status)
    }
    
    // 3. 取引履歴確認
    const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
    console.log(`\n取引履歴確認中... (${address})`)
    
    const txResponse = await fetch(`${nodeUrl}/accounts/${address}/transactions/confirmed?pageSize=10`)
    if (txResponse.ok) {
      const transactions = await txResponse.json()
      console.log('取引数:', transactions.data ? transactions.data.length : 0)
      
      if (transactions.data && transactions.data.length > 0) {
        console.log('\n📋 最新の取引:')
        
        // Z0BY4UEWのメッセージを探す
        let foundZ0BY4UEW = false
        
        for (let i = 0; i < Math.min(5, transactions.data.length); i++) {
          const tx = transactions.data[i]
          
          if (tx.transaction?.type === 16724 && tx.transaction.message?.payload) {
            // メッセージをデコード
            const messageHex = tx.transaction.message.payload
            let message = ''
            
            try {
              for (let j = 0; j < messageHex.length; j += 2) {
                const hex = messageHex.substr(j, 2)
                const charCode = parseInt(hex, 16)
                if (charCode > 0) {
                  message += String.fromCharCode(charCode)
                }
              }
              
              console.log(`取引 ${i + 1}: メッセージ="${message}", 金額=${parseInt(tx.transaction.mosaics[0]?.amount || 0) / 1000000} XYM`)
              
              if (message === 'Z0BY4UEW') {
                foundZ0BY4UEW = true
                console.log('🎯 Z0BY4UEWの取引を発見！')
              }
              
            } catch (error) {
              console.log(`取引 ${i + 1}: メッセージデコードエラー`)
            }
          }
        }
        
        if (foundZ0BY4UEW) {
          console.log('\n✅ Z0BY4UEWの送金がブロックチェーンに記録されています')
          console.log('システムが正しく設定されていれば、数分以内に検知されるはずです')
        } else {
          console.log('\n❌ Z0BY4UEWの取引が見つかりませんでした')
          console.log('送金が完了していない、または異なるアドレスに送金された可能性があります')
        }
        
      } else {
        console.log('⚠️  取引履歴がありません')
      }
    } else {
      console.log('❌ 取引履歴取得失敗:', txResponse.status)
    }
    
    console.log('\n=== 次のステップ ===')
    console.log('1. ブラウザで http://localhost:3000/api/payment/monitor/Z0BY4UEW を開く')
    console.log('2. 開発者ツールでSSEイベントを監視')
    console.log('3. 数分待って決済が自動的に確認されるか確認')
    console.log('4. http://localhost:3000/api/payment/status/Z0BY4UEW でステータス変更を確認')
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

testFinalConfiguration()
