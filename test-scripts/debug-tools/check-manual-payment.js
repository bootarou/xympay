// 手動での着金確認スクリプト
const fs = require('fs')
const path = require('path')

// .envファイルを手動で読み込み
try {
  const envPath = path.join(__dirname, '.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/"/g, '')
    }
  })
} catch (error) {
  console.log('⚠️ .envファイルの読み込みに失敗:', error.message)
}

async function checkManualPayment() {
  console.log('=== 手動着金確認 ===')
    // 対象アドレスと決済IDを入力してください
  const recipientAddress = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY'  // 受取アドレス
  const expectedMessage = 'OS11ZH79'  // 決済ID（実際の値に変更してください）
  const expectedAmountXYM = 1  // 期待する金額（XYM単位）
  const expectedAmountMicroXYM = expectedAmountXYM * 1000000  // マイクロXYM単位に変換
  
  console.log('確認対象:')
  console.log('  受取アドレス:', recipientAddress)
  console.log('  期待メッセージ:', expectedMessage)
  console.log('  期待金額 (XYM):', expectedAmountXYM)
  console.log('  期待金額 (マイクロXYM):', expectedAmountMicroXYM)
  
  try {
    const { RepositoryFactoryHttp, Address, TransactionGroup } = require('symbol-sdk')
    const nodeUrl = process.env.SYMBOL_NODE_URL
    
    console.log('Symbol ノード:', nodeUrl)
    
    const repositoryFactory = new RepositoryFactoryHttp(nodeUrl)
    const transactionRepository = repositoryFactory.createTransactionRepository()
    const address = Address.createFromRawAddress(recipientAddress)
    
    console.log('\nトランザクション検索中...')
    
    const searchCriteria = {
      group: TransactionGroup.Confirmed,
      recipientAddress: address,
      pageSize: 50,
      pageNumber: 1
    }
    
    const transactionPage = await transactionRepository.search(searchCriteria).toPromise()
    
    console.log(`取得したトランザクション数: ${transactionPage.data.length}`)
    
    if (transactionPage.data.length === 0) {
      console.log('❌ 該当するトランザクションが見つかりません')
      return
    }
    
    console.log('\n📊 最近のトランザクション:')
    
    transactionPage.data.forEach((tx, index) => {
      if (tx.type === 16724) { // Transfer transaction
        const mosaics = tx.mosaics || []
        const totalAmount = mosaics.reduce((sum, mosaic) => {
          return sum + mosaic.amount.compact()
        }, 0)
        
        const message = tx.message?.payload || ''
        const timestamp = tx.transactionInfo?.timestamp
        const txId = tx.transactionInfo?.id || ''
        
        console.log(`  ${index + 1}. ${txId.substring(0, 16)}...`)
        console.log(`     金額: ${totalAmount} マイクロXYM`)
        console.log(`     メッセージ: "${message}"`)
        console.log(`     時刻: ${timestamp ? new Date(timestamp.compact() + Date.UTC(2016, 2, 29, 0, 6, 25, 0)).toISOString() : '不明'}`)
          // 条件マッチ確認
        if (message === expectedMessage && totalAmount === expectedAmountMicroXYM) {
          console.log('     🎉 条件一致！このトランザクションが着金対象です')
        } else if (message === expectedMessage) {
          console.log('     ⚠️ メッセージは一致するが金額が異なります')
          console.log(`     期待: ${expectedAmountMicroXYM} マイクロXYM, 実際: ${totalAmount} マイクロXYM`)
        } else if (totalAmount === expectedAmountMicroXYM) {
          console.log('     ⚠️ 金額は一致するがメッセージが異なります')
          console.log(`     期待: "${expectedMessage}", 実際: "${message}"`)
        }
        console.log('')
      }
    })
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.error(error)
  }
}

checkManualPayment().catch(console.error)
