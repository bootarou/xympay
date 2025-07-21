const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

async function testActualPayment() {
  const prisma = new PrismaClient()
  
  try {
    console.log('=== 実際の支払い検出テスト ===')
    
    const paymentId = 'X3KWSV3P' // 最新のpending支払い
    
    // 支払い情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('支払い情報が見つかりません')
      return
    }
    
    console.log('テスト対象支払い情報:')
    console.log('  Payment ID:', payment.paymentId)
    console.log('  金額:', payment.amount, 'XYM')
    console.log('  受信アドレス:', payment.address.address)
    console.log('  期待メッセージ:', paymentId)
    console.log('  ステータス:', payment.status)
    console.log('  作成日時:', payment.createdAt)
    
    // 手動でSymbol APIをテスト
    console.log('\n=== 手動 Symbol API テスト ===')
    const nodeUrl = 'https://sym-test-01.opening-line.jp:3001'
    const address = payment.address.address
    
    try {
      // ノード情報取得
      console.log('1. ノード情報取得中...')
      const nodeInfoResponse = await fetch(`${nodeUrl}/node/info`)
      const nodeInfo = await nodeInfoResponse.json()
      console.log('✅ ノード情報取得成功:', nodeInfo.version)
      
      // アカウント情報取得
      console.log('2. アカウント情報取得中...')
      const accountResponse = await fetch(`${nodeUrl}/accounts/${address}`)
      if (accountResponse.ok) {
        const accountInfo = await accountResponse.json()
        console.log('✅ アカウント情報取得成功')
        console.log('   アドレス:', accountInfo.account.address)
        console.log('   バランス:', accountInfo.account.mosaics)
      } else {
        console.log('⚠️  アカウント情報が取得できません (未使用アドレスの可能性)')
      }
      
      // トランザクション検索
      console.log('3. トランザクション検索中...')
      const txResponse = await fetch(`${nodeUrl}/transactions/confirmed?recipientAddress=${address}&pageSize=20`)
      
      if (txResponse.ok) {
        const txData = await txResponse.json()
        console.log('✅ トランザクション検索成功')
        console.log('   取得トランザクション数:', txData.data.length)
        
        if (txData.data.length > 0) {
          console.log('\n=== 最新のトランザクション ===')
          
          const recentTxs = txData.data.slice(0, 3) // 最新3件
          
          for (let i = 0; i < recentTxs.length; i++) {
            const tx = recentTxs[i]
            console.log(`\n${i + 1}. Transaction:`)
            console.log('   ID:', tx.meta?.id || 'N/A')
            console.log('   Hash:', tx.meta?.hash || 'N/A')
            console.log('   Type:', tx.transaction?.type || 'N/A')
            console.log('   Signer:', tx.transaction?.signerPublicKey || 'N/A')
            console.log('   Recipient:', tx.transaction?.recipientAddress || 'N/A')
            console.log('   Timestamp:', tx.meta?.timestamp || 'N/A')
            
            if (tx.transaction?.mosaics) {
              console.log('   Mosaics:', tx.transaction.mosaics)
            }
            
            if (tx.transaction?.message) {
              console.log('   Message:', tx.transaction.message)
            }
          }
        } else {
          console.log('📭 このアドレス宛てのトランザクションはありません')
        }
      } else {
        console.log('❌ トランザクション検索失敗:', txResponse.status, txResponse.statusText)
      }
      
    } catch (apiError) {
      console.error('❌ Symbol API エラー:', apiError.message)
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testActualPayment()
