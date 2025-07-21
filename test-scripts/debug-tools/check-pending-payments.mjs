import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPendingPayments() {
  try {
    console.log('=== 処理中（pending）決済の確認 ===');
    
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'pending' },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('処理中の決済数:', pendingPayments.length);
    
    if (pendingPayments.length > 0) {
      console.log('\n詳細:');
      pendingPayments.forEach((payment, index) => {
        console.log(`${index + 1}. 決済ID: ${payment.paymentId}`);
        console.log(`   商品: ${payment.product.name}`);
        console.log(`   金額: ${(Number(payment.amount) / 1000000).toLocaleString()} XYM`);
        console.log(`   作成日時: ${payment.createdAt.toLocaleString()}`);
        console.log(`   期限: ${payment.expireAt.toLocaleString()}`);
        console.log(`   ユーザー: ${payment.user?.email || 'なし'}`);
        console.log('');
      });
    } else {
      console.log('現在処理中の決済はありません');
    }
    
    // 全ステータスの統計
    console.log('\n=== 全ステータス統計 ===');
    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    statusCounts.forEach(item => {
      console.log(`${item.status}: ${item._count.status}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingPayments().catch(console.error);
