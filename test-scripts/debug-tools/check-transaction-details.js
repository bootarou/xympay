async function checkTransactionDetails() {
  try {
    console.log('=== 送金取引詳細確認 ===')
    
    const txHash = 'F53D9AE0910A96FC9967DFCBC5775929F15B54FA45C8BFF9709C5DD884350B7F'
    console.log('取引ハッシュ:', txHash)
    console.log('Symbol Explorer URL: https://testnet.symbol.fyi/transactions/' + txHash)
    console.log('')
    
    // Symbol APIで取引詳細を取得
    const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
    
    console.log('取引詳細取得中...')
    try {
      const response = await fetch(`${nodeUrl}/transactions/confirmed/${txHash}`)
      
      if (response.ok) {
        const txData = await response.json()
        console.log('✅ 取引詳細取得成功')
        
        const tx = txData.transaction
        console.log('')
        console.log('📋 取引詳細:')
        console.log('取引タイプ:', tx.type === 16724 ? 'Transfer (送金)' : tx.type)
        console.log('受取者:', tx.recipientAddress)
        
        if (tx.mosaics && tx.mosaics.length > 0) {
          const amount = parseInt(tx.mosaics[0].amount)
          console.log('金額 (μXYM):', amount)
          console.log('金額 (XYM):', amount / 1000000)
        }
        
        if (tx.message && tx.message.payload) {
          console.log('メッセージ (HEX):', tx.message.payload)
          
          // HEXをデコード
          try {
            let message = ''
            const hex = tx.message.payload
            for (let i = 0; i < hex.length; i += 2) {
              const charCode = parseInt(hex.substr(i, 2), 16)
              if (charCode > 0) {
                message += String.fromCharCode(charCode)
              }
            }
            console.log('メッセージ (テキスト):', `"${message}"`)
            
            // 期待するメッセージと比較
            if (message === 'Z0BY4UEW') {
              console.log('✅ メッセージが期待値と一致しています！')
            } else {
              console.log('❌ メッセージが期待値(Z0BY4UEW)と一致しません')
            }
          } catch (error) {
            console.log('❌ メッセージデコードエラー:', error)
          }
        }
        
        console.log('')
        console.log('🎯 XYMPay システム確認:')
        console.log('受取アドレス一致確認:', tx.recipientAddress === 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY' ? '✅ 一致' : '❌ 不一致')
        
        const expectedAmount = 2000000 // 2 XYM = 2,000,000 μXYM
        const actualAmount = parseInt(tx.mosaics[0]?.amount || 0)
        console.log('金額一致確認:', actualAmount === expectedAmount ? '✅ 一致' : '❌ 不一致')
        
      } else if (response.status === 404) {
        console.log('⏳ 取引がまだ確定していません (404)')
        console.log('数分待ってから再度確認してください')
      } else {
        console.log('❌ 取引詳細取得失敗:', response.status)
      }
      
    } catch (apiError) {
      console.log('❌ API エラー:', apiError.message)
    }
    
    console.log('')
    console.log('📊 決済ステータス確認:')
    console.log('ステータス確認URL: http://localhost:3000/api/payment/status/Z0BY4UEW')
    console.log('監視URL: http://localhost:3000/api/payment/monitor/Z0BY4UEW')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

checkTransactionDetails()
