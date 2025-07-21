const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSymbolConnection() {
  try {
    console.log('=== Symbol ノード接続テスト ===')
    
    const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
    console.log('ノードURL:', nodeUrl)
    
    // 1. ノード情報を取得
    console.log('\n1. ノード情報取得中...')
    try {
      const nodeInfoResponse = await fetch(`${nodeUrl}/node/info`)
      if (nodeInfoResponse.ok) {
        const nodeInfo = await nodeInfoResponse.json()
        console.log('✅ ノード接続成功')
        console.log('ノード名:', nodeInfo.friendlyName)
        console.log('バージョン:', nodeInfo.version)
      } else {
        console.log('❌ ノード情報取得失敗:', nodeInfoResponse.status)
      }
    } catch (error) {
      console.log('❌ ノード接続エラー:', error.message)
    }
    
    // 2. ネットワーク情報を取得
    console.log('\n2. ネットワーク情報取得中...')
    try {
      const networkResponse = await fetch(`${nodeUrl}/network`)
      if (networkResponse.ok) {
        const networkInfo = await networkResponse.json()
        console.log('✅ ネットワーク情報取得成功')
        console.log('ネットワーク名:', networkInfo.name)
      } else {
        console.log('❌ ネットワーク情報取得失敗:', networkResponse.status)
      }
    } catch (error) {
      console.log('❌ ネットワーク情報取得エラー:', error.message)
    }
    
    // 3. 対象アドレスの情報を取得
    const address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
    console.log(`\n3. アドレス情報取得中... (${address})`)
    
    try {
      const accountResponse = await fetch(`${nodeUrl}/accounts/${address}`)
      if (accountResponse.ok) {
        const accountInfo = await accountResponse.json()
        console.log('✅ アカウント情報取得成功')
        console.log('アドレス:', accountInfo.account.address)
        
        if (accountInfo.account.mosaics && accountInfo.account.mosaics.length > 0) {
          for (const mosaic of accountInfo.account.mosaics) {
            const amount = parseInt(mosaic.amount)
            console.log(`残高: ${amount / 1000000} XYM (${amount} μXYM)`)
          }
        } else {
          console.log('残高: 0 XYM')
        }
      } else {
        console.log('❌ アカウント情報取得失敗:', accountResponse.status)
        if (accountResponse.status === 404) {
          console.log('⚠️  アドレスが見つかりません（まだ取引履歴がない可能性）')
        }
      }
    } catch (error) {
      console.log('❌ アカウント情報取得エラー:', error.message)
    }
    
    // 4. 取引履歴を確認
    console.log('\n4. 取引履歴取得中...')
    try {
      const transactionResponse = await fetch(`${nodeUrl}/accounts/${address}/transactions/confirmed?pageSize=10`)
      if (transactionResponse.ok) {
        const transactions = await transactionResponse.json()
        console.log('✅ 取引履歴取得成功')
        console.log('取引数:', transactions.data ? transactions.data.length : 0)
        
        if (transactions.data && transactions.data.length > 0) {
          console.log('\n📋 最新の取引:')
          for (let i = 0; i < Math.min(3, transactions.data.length); i++) {
            const tx = transactions.data[i]
            console.log(`--- 取引 ${i + 1} ---`)
            console.log('ハッシュ:', tx.meta?.hash?.substring(0, 16) + '...')
            console.log('高さ:', tx.meta?.height)
            console.log('取引タイプ:', tx.transaction?.type)
            
            if (tx.transaction?.type === 16724 && tx.transaction.mosaics) { // Transfer
              const amount = parseInt(tx.transaction.mosaics[0]?.amount || 0)
              console.log('金額:', amount / 1000000, 'XYM')
              
              if (tx.transaction.message?.payload) {
                try {
                  const messageHex = tx.transaction.message.payload
                  let message = ''
                  for (let j = 0; j < messageHex.length; j += 2) {
                    const hex = messageHex.substr(j, 2)
                    const charCode = parseInt(hex, 16)
                    if (charCode > 0) {
                      message += String.fromCharCode(charCode)
                    }
                  }
                  console.log('メッセージ:', `"${message}"`)
                } catch (error) {
                  console.log('メッセージデコードエラー')
                }
              }
            }
          }
        } else {
          console.log('⚠️  取引履歴がありません')
        }
      } else {
        console.log('❌ 取引履歴取得失敗:', transactionResponse.status)
      }
    } catch (error) {
      console.log('❌ 取引履歴取得エラー:', error.message)
    }
    
    console.log('\n=== テスト完了 ===')
    console.log('🎯 次のステップ:')
    console.log('1. Symbol ウォレットで送金を実行')
    console.log('2. 送金先: TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY')
    console.log('3. 金額: 2 XYM')
    console.log('4. メッセージ: E0TTPXLC')
    console.log('5. 送金完了後、このスクリプトを再実行して取引が記録されているか確認')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSymbolConnection()
