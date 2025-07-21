// Symbol SDK を使わずにアドレス変換を確認
async function checkAddressConversion() {
  try {
    console.log('=== アドレス変換確認 ===')
    
    const hexAddress = '98ADF6C8073ED934056D9384EB680EBC2ECA500515CEC7AB'
    const base32Address = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'
    
    console.log('取引受取者 (HEX):', hexAddress)
    console.log('期待アドレス (Base32):', base32Address)
    console.log('')
    
    // Symbol APIでアドレス情報を確認
    const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
    
    console.log('アドレス情報取得中...')
    try {
      const response = await fetch(`${nodeUrl}/accounts/${base32Address}`)
      
      if (response.ok) {
        const accountData = await response.json()
        console.log('✅ アカウント情報取得成功')
        console.log('アカウントアドレス (API返り値):', accountData.account.address)
        
        // アドレスが一致するか確認
        if (accountData.account.address === hexAddress) {
          console.log('✅ アドレス変換一致: Base32とHEXは同じアドレスです')
        } else {
          console.log('❌ アドレス変換不一致')
          console.log('期待HEX:', accountData.account.address)
          console.log('実際HEX:', hexAddress)
        }
        
      } else {
        console.log('❌ アカウント情報取得失敗:', response.status)
      }
      
    } catch (apiError) {
      console.log('❌ API エラー:', apiError.message)
    }
    
    console.log('')
    console.log('🔍 Symbol監視システムの確認:')
    console.log('システムは両方の形式でアドレス比較を行う必要があります')
    
    // 取引履歴を再確認
    console.log('')
    console.log('取引履歴再確認中...')
    try {
      const txResponse = await fetch(`${nodeUrl}/accounts/${base32Address}/transactions/confirmed?pageSize=5`)
      
      if (txResponse.ok) {
        const transactions = await txResponse.json()
        console.log('取引数:', transactions.data ? transactions.data.length : 0)
        
        if (transactions.data && transactions.data.length > 0) {
          console.log('')
          console.log('📋 最新の取引:')
          
          for (let i = 0; i < Math.min(3, transactions.data.length); i++) {
            const tx = transactions.data[i]
            
            if (tx.transaction?.type === 16724) {
              const amount = parseInt(tx.transaction.mosaics[0]?.amount || 0)
              console.log(`取引 ${i + 1}:`)
              console.log(`  金額: ${amount / 1000000} XYM`)
              console.log(`  ハッシュ: ${tx.meta?.hash?.substring(0, 16)}...`)
              
              if (tx.transaction.message?.payload) {
                try {
                  let message = ''
                  const hex = tx.transaction.message.payload
                  for (let j = 0; j < hex.length; j += 2) {
                    const charCode = parseInt(hex.substr(j, 2), 16)
                    if (charCode > 0) {
                      message += String.fromCharCode(charCode)
                    }
                  }
                  console.log(`  メッセージ: "${message}"`)
                  
                  if (message === 'Z0BY4UEW') {
                    console.log('  🎯 Z0BY4UEWの取引を発見！')
                  }
                } catch (error) {
                  console.log('  メッセージデコードエラー')
                }
              } else {
                console.log('  メッセージ: なし')
              }
            }
          }
        }
      } else {
        console.log('❌ 取引履歴取得失敗:', txResponse.status)
      }
      
    } catch (txError) {
      console.log('❌ 取引履歴取得エラー:', txError.message)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

checkAddressConversion()
