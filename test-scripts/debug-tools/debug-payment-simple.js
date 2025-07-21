const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugPayment() {
  try {
    console.log('=== 決済9IUXOBTD デバッグ開始 ===')
    console.log('')
    
    // 1. 決済情報取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: '9IUXOBTD' },
      include: {
        product: true,
        address: true
      }
    })
    
    if (!payment) {
      console.log('❌ 決済が見つかりません: 9IUXOBTD')
      return
    }
    
    console.log('✅ 決済情報:')
    console.log('決済ID:', payment.paymentId)
    console.log('商品名:', payment.product.name)
    console.log('商品価格 (XYM):', payment.product.price)
    console.log('決済金額 (DB μXYM):', payment.amount)
    console.log('決済金額 (XYM換算):', Number(payment.amount) / 1000000)
    console.log('受取アドレス:', payment.address.address)
    console.log('ステータス:', payment.status)
    console.log('メッセージ:', payment.paymentId)
    console.log('作成日時:', payment.createdAt.toISOString())
    console.log('期限:', payment.expireAt.toISOString())
    console.log('現在時刻:', new Date().toISOString())
    console.log('期限切れ？:', new Date() > payment.expireAt ? 'YES' : 'NO')
    console.log('')
    
    // 2. 監視API状態確認
    console.log('🔍 監視API状態確認...')
    try {
      const response = await fetch(`http://localhost:3000/api/payment/status/${payment.paymentId}`)
      console.log('ステータスAPI レスポンスステータス:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ APIレスポンス:')
        console.log(JSON.stringify(data, null, 2))
      } else {
        console.log('❌ ステータスAPIエラー:', response.statusText)
        const text = await response.text()
        console.log('エラー詳細:', text)
      }
    } catch (error) {
      console.error('❌ ステータスAPI接続エラー:', error.message)
    }
    
    console.log('')
    
    // 3. Symbol取引確認用のCURL情報を表示
    console.log('🔧 手動Symbol取引確認コマンド:')
    console.log(`curl "https://sym-test-01.opening-line.jp:3001/accounts/${payment.address.address}/transactions/confirmed?pageSize=100"`)
    console.log('')
    
    console.log('📝 確認すべきポイント:')
    console.log('1. メッセージが正確に', payment.paymentId, 'であること')
    console.log('2. 金額が正確に', payment.amount, 'μXYMであること (', Number(payment.amount) / 1000000, 'XYM)')
    console.log('3. 受取アドレスが', payment.address.address, 'であること')
    console.log('4. 取引がブロックチェーンに記録されていること')
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPayment()
