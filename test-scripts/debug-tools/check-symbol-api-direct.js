const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSymbolTransactions() {
  try {
    console.log('=== Symbol取引履歴確認 ===')
    
    // 最新の決済情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: 'E0TTPXLC' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません')
      return
    }
    
    console.log('決済情報:')
    console.log('決済ID:', payment.paymentId)
    console.log('受取アドレス:', payment.address.address)
    console.log('期待金額 (μXYM):', payment.amount)
    console.log('期待金額 (XYM):', Number(payment.amount) / 1000000)
    console.log('期待メッセージ:', payment.paymentId)
    console.log('')
    
    // Symbol API を直接呼び出し
    const apiUrl = `https://sym-test-01.opening-line.jp:3001/accounts/${payment.address.address}/transactions/confirmed?pageSize=100`
    console.log('API URL:', apiUrl)
    console.log('')
    
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) {
        console.log('❌ API呼び出し失敗:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('取得した取引数:', data.data ? data.data.length : 0)
      
      if (!data.data || data.data.length === 0) {
        console.log('❌ 取引履歴が見つかりません')
        console.log('可能な原因:')
        console.log('1. まだ送金していない')
        console.log('2. 送金はしたがまだブロックチェーンに記録されていない')
        console.log('3. アドレスが間違っている')
        return
      }
      
      console.log('📋 最新の取引履歴:')
      
      for (let i = 0; i < Math.min(data.data.length, 5); i++) {
        const tx = data.data[i]
        console.log(`--- 取引 ${i + 1} ---`)
        console.log('取引ハッシュ:', tx.meta?.hash || 'N/A')
        console.log('高さ:', tx.meta?.height || 'N/A')
        console.log('取引タイプ:', tx.transaction?.type || 'N/A')
        
        if (tx.transaction?.type === 16724) { // Transfer transaction
          console.log('送金者:', tx.transaction.signerPublicKey)
          console.log('受取者:', tx.transaction.recipientAddress)
          
          // 金額チェック
          if (tx.transaction.mosaics && tx.transaction.mosaics.length > 0) {
            const mosaic = tx.transaction.mosaics[0]
            const amount = parseInt(mosaic.amount)
            console.log('金額 (μXYM):', amount)
            console.log('金額 (XYM):', amount / 1000000)
            
            // 期待金額と比較
            if (amount === Number(payment.amount)) {
              console.log('✅ 金額が一致しています！')
            } else {
              console.log('❌ 金額が一致しません。期待:', Number(payment.amount), '実際:', amount)
            }
          }
          
          // メッセージチェック
          if (tx.transaction.message) {
            const messageHex = tx.transaction.message.payload
            let message = ''
            
            if (messageHex && messageHex.length > 0) {
              try {
                // HEXをUTF-8にデコード
                message = ''
                for (let j = 0; j < messageHex.length; j += 2) {
                  const hex = messageHex.substr(j, 2)
                  const charCode = parseInt(hex, 16)
                  if (charCode > 0) {
                    message += String.fromCharCode(charCode)
                  }
                }
                console.log('メッセージ:', `"${message}"`)
                
                // 期待メッセージと比較
                if (message === payment.paymentId) {
                  console.log('✅ メッセージが一致しています！')
                } else {
                  console.log('❌ メッセージが一致しません。期待:', `"${payment.paymentId}"`, '実際:', `"${message}"`)
                }
              } catch (error) {
                console.log('❌ メッセージデコードエラー:', error.message)
              }
            } else {
              console.log('⚠️  メッセージが空です')
            }
          } else {
            console.log('⚠️  メッセージが設定されていません')
          }
          
          // タイムスタンプ
          if (tx.transaction.deadline) {
            console.log('タイムスタンプ:', new Date(parseInt(tx.transaction.deadline) / 1000 + Date.UTC(2016, 2, 29, 0, 6, 25, 0)).toISOString())
          }
        }
        
        console.log('')
      }
      
    } catch (apiError) {
      console.error('❌ Symbol API エラー:', apiError.message)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSymbolTransactions()
