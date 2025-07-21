// 取引履歴テストスクリプト
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTransactionHistory() {
  try {
    console.log('=== 取引履歴テスト開始 ===')
    
    // 1. 全決済データを確認
    const allPayments = await prisma.payment.findMany({
      include: {
        product: {
          select: {
            name: true,
            price: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: {
          select: {
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    console.log(`\n✓ 全決済データ数: ${allPayments.length}`)
    
    if (allPayments.length > 0) {
      console.log('\n--- 最新5件の決済データ ---')
      allPayments.slice(0, 5).forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.id}`)
        console.log(`   PaymentID: ${payment.paymentId}`)
        console.log(`   商品名: ${payment.product.name}`)
        console.log(`   金額: ${payment.amount} μXYM`)
        console.log(`   ステータス: ${payment.status}`)
        console.log(`   取引ID: ${payment.transactionId || 'なし'}`)
        console.log(`   送信者: ${payment.senderAddress || 'なし'}`)
        console.log(`   確認日時: ${payment.confirmedAt || 'なし'}`)
        console.log(`   作成日時: ${payment.createdAt}`)
        console.log(`   ユーザー: ${payment.user?.name || 'なし'} (${payment.user?.email || 'なし'})`)
        console.log('')
      })
    }
    
    // 2. 完了済み決済の統計
    const completedPayments = await prisma.payment.findMany({
      where: {
        status: 'confirmed',
      },
      select: {
        amount: true,
        confirmedAt: true,
      },
    })
    
    console.log(`\n✓ 完了済み決済数: ${completedPayments.length}`)
    
    if (completedPayments.length > 0) {
      const totalAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const averageAmount = totalAmount / completedPayments.length
      
      console.log(`✓ 総売上: ${totalAmount} μXYM`)
      console.log(`✓ 平均取引額: ${averageAmount.toFixed(2)} μXYM`)
    }
    
    // 3. ステータス別の分布
    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })
    
    console.log('\n--- ステータス別分布 ---')
    statusCounts.forEach(status => {
      console.log(`${status.status}: ${status._count.id}件`)
    })
    
    // 4. 今月の取引数
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const monthlyPayments = await prisma.payment.count({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: thisMonth,
        },
      },
    })
    
    console.log(`\n✓ 今月の完了済み取引数: ${monthlyPayments}`)
    
    // 5. APIエンドポイントテスト用のユーザーIDを取得
    const userWithPayments = await prisma.user.findFirst({
      where: {
        payments: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })
    
    if (userWithPayments) {
      console.log(`\n✓ テスト用ユーザーID: ${userWithPayments.id}`)
      console.log(`  名前: ${userWithPayments.name}`)
      console.log(`  メール: ${userWithPayments.email}`)
    }
    
    console.log('\n=== 取引履歴テスト完了 ===')
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTransactionHistory()
