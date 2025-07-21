const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTransactionHistory() {
  try {
    console.log('=== 送金トランザクション調査 ===')
    console.log('対象決済ID: 9IUXOBTD')
    console.log('受取アドレス: TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY')
    console.log('')
    
    // Symbol APIで最近のトランザクションを確認
    const fetch = (await import('node-fetch')).default
    const nodeUrl = 'https://sym-test-03.opening-line.jp:3001'
    
    // アドレスの最近のトランザクションを取得
    const response = await fetch(`${nodeUrl}/accounts/TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY/transactions/confirmed?pageSize=10`)
    
    if (!response.ok) {
      console.log('❌ API呼び出し失敗:', response.status)
      return
    }
    
    const transactions = await response.json()
    
    console.log('📋 最近の確定トランザクション:')
    console.log('取得件数:', transactions.data.length)
    console.log('')
    
    let foundMessageMatch = false
    
    for (let i = 0; i < transactions.data.length; i++) {
      const tx = transactions.data[i]
      const txInfo = tx.transaction
      
      if (txInfo.type === 16724) { // Transfer transaction
        console.log(`--- トランザクション ${i + 1} ---`)
        console.log('ハッシュ:', txInfo.transactionInfo.hash)
        console.log('高さ:', txInfo.transactionInfo.height)
        console.log('タイムスタンプ:', new Date(parseInt(txInfo.transactionInfo.timestamp) / 1000 + Date.UTC(2016, 2, 29, 0, 6, 25)).toISOString())
        
        // 金額確認
        if (txInfo.mosaics && txInfo.mosaics.length > 0) {
          const amount = parseInt(txInfo.mosaics[0].amount)
          console.log('金額:', amount, 'μXYM (', amount / 1000000, 'XYM )')
        }
        
        // メッセージ確認
        if (txInfo.message) {
          let message = ''
          try {
            // HEXメッセージをデコード
            const hex = txInfo.message.payload
            message = Buffer.from(hex, 'hex').toString('utf8')
            console.log('メッセージ (デコード済み):', message)
            
            if (message === '9IUXOBTD') {
              foundMessageMatch = true
              console.log('🎯 メッセージが一致！これが該当トランザクションです')
            }
          } catch (e) {
            console.log('メッセージ (RAW):', txInfo.message.payload)
          }
        } else {
          console.log('メッセージ: なし')
        }
        console.log('')
      }
    }
    
    if (!foundMessageMatch) {
      console.log('⚠️  メッセージ "9IUXOBTD" に一致するトランザクションが見つかりません')
      console.log('')
      console.log('可能な原因:')
      console.log('1. 送金時のメッセージが間違っている')
      console.log('2. 送金がまだ確定していない')
      console.log('3. 送金先アドレスが間違っている')
      console.log('4. トランザクション確定に時間がかかっている')
    }
    
  } catch (error) {
    console.error('❌ 調査エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTransactionHistory()
