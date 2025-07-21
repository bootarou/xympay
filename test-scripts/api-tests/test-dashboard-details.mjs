import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDashboardDetails() {
  console.log('=== ダッシュボード詳細データテスト ===');
  
  try {
    // 最初のユーザーを取得
    const user = await prisma.user.findFirst({
      where: { name: 'test' }
    });
    
    if (!user) {
      console.log('ユーザーが見つかりません');
      return;
    }
    
    console.log(`ユーザー: ${user.name} (ID: ${user.id})`);
    
    // 統計データを取得
    const [
      totalSales,
      totalTransactions,
      pendingPayments,
      errorCount,
      recentTransactions
    ] = await Promise.all([
      // 総売上（全期間の確認済み取引）
      prisma.payment.aggregate({
        where: {
          userId: user.id,
          status: 'confirmed'
        },
        _sum: {
          amount: true
        }
      }),
      
      // 総取引数（確認済み）
      prisma.payment.count({
        where: {
          userId: user.id,
          status: 'confirmed'
        }
      }),
      
      // 保留中の取引数
      prisma.payment.count({
        where: {
          userId: user.id,
          status: 'pending'
        }
      }),
      
      // エラーまたは期限切れの取引数
      prisma.payment.count({
        where: {
          userId: user.id,
          status: { in: ['expired', 'cancelled'] }
        }
      }),
      
      // 最近の取引（最新10件）
      prisma.payment.findMany({
        where: {
          userId: user.id,
          status: 'confirmed'
        },
        include: {
          product: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          confirmedAt: 'desc'
        },
        take: 10
      })
    ]);
    
    console.log('\n=== 統計情報 ===');
    console.log(`総売上: ${totalSales._sum.amount?.toString() || '0'} μXYM`);
    console.log(`総取引数: ${totalTransactions}`);
    console.log(`保留中の取引: ${pendingPayments}`);
    console.log(`エラー取引: ${errorCount}`);
    
    console.log('\n=== 最近の取引 ===');
    if (recentTransactions.length > 0) {
      recentTransactions.forEach((transaction, index) => {
        console.log(`${index + 1}. [${transaction.paymentId}] ${transaction.product.name} - ${transaction.amount.toString()} μXYM (${transaction.confirmedAt?.toLocaleDateString()})`);
      });
    } else {
      console.log('取引がありません');
    }
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardDetails();
