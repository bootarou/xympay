const fetch = require('node-fetch')

async function findPaymentTransactions() {
  console.log('=== 支払いトランザクション詳細調査 ===')
  
  const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
  const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
  const expectedPaymentIds = ['X3KWSV3P', 'RX3MCZ1P', '0B3H4H8X'] // 最近の支払いID
  
  try {
    console.log('受信アドレス:', address)
    console.log('探している支払いID:', expectedPaymentIds)
    
    // 受信トランザクションを多めに取得
    console.log('\n📋 受信トランザクション詳細調査...')
    const response = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=50`)
    
    if (!response.ok) {
      console.log('❌ トランザクション取得失敗:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('✅ 取得成功 - トランザクション数:', data.data?.length || 0)
    
    if (!data.data || data.data.length === 0) {
      console.log('📭 トランザクションがありません')
      return
    }
    
    console.log('\n=== 全トランザクション詳細 ===')
    
    let foundPayments = []
    
    for (let i = 0; i < data.data.length; i++) {
      const tx = data.data[i]
      
      console.log(`\n${i + 1}. Transaction Hash: ${tx.meta?.hash?.substring(0, 16)}...`)
      console.log(`   Type: ${tx.transaction?.type}`)
      console.log(`   Timestamp: ${tx.meta?.timestamp}`)
      
      // アドレス情報
      if (tx.transaction?.signerPublicKey) {
        console.log(`   Signer: ${tx.transaction.signerPublicKey.substring(0, 16)}...`)
      }
      console.log(`   Recipient: ${tx.transaction?.recipientAddress}`)
      
      // 金額情報
      if (tx.transaction?.mosaics && tx.transaction.mosaics.length > 0) {
        const mosaic = tx.transaction.mosaics[0]
        const amountMicroXym = parseInt(mosaic.amount)
        const amountXym = amountMicroXym / 1000000
        console.log(`   Amount: ${amountMicroXym} microXYM (${amountXym} XYM)`)
        console.log(`   Mosaic ID: ${mosaic.id}`)
      }
      
      // メッセージ情報
      if (tx.transaction?.message) {
        const message = tx.transaction.message
        console.log(`   Message Type: ${message.type}`)
        console.log(`   Message Payload: "${message.payload}"`)
        
        // 支払いIDとの一致チェック
        const messagePayload = message.payload || ''
        const matchingPaymentId = expectedPaymentIds.find(id => messagePayload.includes(id))
        
        if (matchingPaymentId) {
          console.log(`   🎯 一致する支払いID発見: ${matchingPaymentId}`)
          foundPayments.push({
            paymentId: matchingPaymentId,
            transactionHash: tx.meta?.hash,
            amount: amountXym,
            timestamp: tx.meta?.timestamp,
            message: messagePayload
          })
        }
      } else {
        console.log(`   Message: なし`)
      }
      
      // 受信者と送信者が同じかチェック
      if (tx.transaction?.recipientAddress && tx.transaction?.signerPublicKey) {
        // Note: signerはPublicKeyなので直接比較は不可能
        console.log(`   💸 送金先: ${tx.transaction.recipientAddress}`)
      }
    }
    
    console.log('\n=== 発見した支払いトランザクション ===')
    if (foundPayments.length === 0) {
      console.log('❌ 支払いIDが一致するトランザクションは見つかりませんでした')
      console.log('\n📝 確認ポイント:')
      console.log('1. 実際に送金が行われているか？')
      console.log('2. メッセージに正確な支払いIDが含まれているか？')
      console.log('3. 送金先アドレスが正確か？')
      console.log('4. 送金者と受信者が同じアドレスの場合、別の検索方法が必要か？')
    } else {
      foundPayments.forEach((payment, index) => {
        console.log(`${index + 1}. 支払いID: ${payment.paymentId}`)
        console.log(`   Transaction: ${payment.transactionHash?.substring(0, 16)}...`)
        console.log(`   金額: ${payment.amount} XYM`)
        console.log(`   メッセージ: "${payment.message}"`)
      })
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

findPaymentTransactions()
