// 着金検知診断スクリプト
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

console.log('=== XYMPay 着金検知診断開始 ===')

// 環境変数の確認
console.log('\n📋 環境設定確認:')
console.log('SYMBOL_NODE_URL:', process.env.SYMBOL_NODE_URL || 'http://testnet1.symbol-mikun.net:3000')
console.log('CHECK_INTERVAL_MS:', process.env.CHECK_INTERVAL_MS || '60000')
console.log('NODE_ENV:', process.env.NODE_ENV)

// Symbol SDK のテスト
const { RepositoryFactoryHttp } = require('symbol-sdk')

async function diagnoseSymbolConnection() {
  console.log('\n🔗 Symbol ノード接続診断:')
  
  const nodeUrl = process.env.SYMBOL_NODE_URL || 'https://testnet-node.ecosymbol.one:3001'
  console.log('テスト対象ノード:', nodeUrl)
  
  try {
    const repositoryFactory = new RepositoryFactoryHttp(nodeUrl)
    const networkRepository = repositoryFactory.createNetworkRepository()
    
    console.log('ネットワーク情報取得中...')
    const networkType = await networkRepository.getNetworkType().toPromise()
    console.log('✅ 成功! ネットワークタイプ:', networkType)
    
    // ノード情報取得
    try {
      const nodeRepository = repositoryFactory.createNodeRepository()
      const nodeInfo = await nodeRepository.getNodeInfo().toPromise()
      console.log('✅ ノード情報取得成功:', {
        version: nodeInfo.version,
        roles: nodeInfo.roles
      })
    } catch (nodeError) {
      console.log('⚠️ ノード情報取得失敗:', nodeError.message)
    }
    
    // トランザクション検索テスト
    console.log('\n📊 トランザクション検索テスト:')
    const transactionRepository = repositoryFactory.createTransactionRepository()
    const searchCriteria = {
      pageSize: 5,
      pageNumber: 1
    }
    
    const transactionPage = await transactionRepository.search(searchCriteria).toPromise()
    console.log('✅ トランザクション検索成功:', transactionPage.data.length, '件取得')
    
    // 最新のトランザクション詳細
    if (transactionPage.data.length > 0) {
      const latestTx = transactionPage.data[0]
      console.log('最新トランザクション例:', {
        type: latestTx.type,
        height: latestTx.transactionInfo?.height?.compact(),
        fee: latestTx.maxFee?.compact()
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ Symbol接続エラー:', error.message)
    console.error('エラー詳細:', error)
    return false
  }
}

// データベース接続テスト
async function diagnoseDatabaseConnection() {
  console.log('\n💾 データベース接続診断:')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // 最新の決済情報を取得
    const latestPayments = await prisma.payment.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        address: true
      }
    })
    
    console.log('✅ データベース接続成功')
    console.log('最新の決済情報:')
    latestPayments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.paymentId} - ${payment.status} - ${payment.product.name}`)
      console.log(`     受取先: ${payment.address.address}`)
      console.log(`     金額: ${payment.amount} XYM`)
      console.log(`     期限: ${payment.expireAt.toISOString()}`)
      console.log(`     作成: ${payment.createdAt.toISOString()}`)
    })
    
    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ データベース接続エラー:', error.message)
    return false
  }
}

// 診断実行
async function runDiagnosis() {
  try {
    const symbolOK = await diagnoseSymbolConnection()
    const dbOK = await diagnoseDatabaseConnection()
    
    console.log('\n📊 診断結果サマリー:')
    console.log('Symbol ノード:', symbolOK ? '✅ 正常' : '❌ 異常')
    console.log('データベース:', dbOK ? '✅ 正常' : '❌ 異常')
    
    if (symbolOK && dbOK) {
      console.log('\n🎉 システムの基本機能は正常です。')
      console.log('着金検知が動作しない場合は、以下を確認してください:')
      console.log('1. 送金時のメッセージに正確な決済IDが入力されているか')
      console.log('2. 送金先アドレスが正確か')
      console.log('3. 送金金額が正確か')
      console.log('4. ブラウザのNetwork DevToolsでSSE接続が確立されているか')
    } else {
      console.log('\n⚠️ システムに問題があります。上記のエラーを確認してください。')
    }
    
  } catch (error) {
    console.error('診断実行エラー:', error)
  }
}

runDiagnosis().catch(console.error)
