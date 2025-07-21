import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDashboardStats() {
  console.log('=== ダッシュボード統計デバッグ ===');
  
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
    
    // 1. 商品数
    const productCount = await prisma.product.count({
      where: { userId: user.id }
    });
    console.log(`\n1. 登録商品数: ${productCount}`);
    
    // 2. 今月の取引を確認
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log(`\n2. 今月の期間: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);
    
    // 今月の取引を取得
    const thisMonthPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'confirmed',
        confirmedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        product: true
      }
    });
    
    console.log(`\n今月の確認済み取引: ${thisMonthPayments.length}件`);
    
    let totalThisMonth = new Prisma.Decimal(0);
    thisMonthPayments.forEach((payment, index) => {
      console.log(`${index + 1}. ${payment.product.name} - ${payment.amount.toString()} μXYM (${payment.confirmedAt?.toLocaleDateString()})`);
      totalThisMonth = totalThisMonth.add(payment.amount);
    });
    
    console.log(`今月の総売上: ${totalThisMonth.toString()} μXYM`);
    console.log(`今月の総売上: ${totalThisMonth.div(1000000).toString()} XYM`);
    
    // 3. 総取引数
    const totalTransactions = await prisma.payment.count({
      where: {
        userId: user.id,
        status: 'confirmed'
      }
    });
    
    console.log(`\n3. 総取引数: ${totalTransactions}`);
    
    // 4. 全取引の詳細
    const allPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'confirmed'
      },
      include: {
        product: true
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    });
    
    console.log(`\n4. 全取引の詳細 (${allPayments.length}件):`);
    allPayments.forEach((payment, index) => {
      console.log(`${index + 1}. ${payment.product.name} - ${payment.amount.toString()} μXYM (${payment.confirmedAt?.toLocaleDateString()})`);
    });
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDashboardStats();
