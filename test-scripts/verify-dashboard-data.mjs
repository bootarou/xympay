import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDashboardData() {
  console.log('=== ダッシュボードデータの確認 ===\n');

  try {
    // ユーザー情報の取得
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    console.log('システム内のユーザー:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email} (ID: ${user.id})`);
    });

    // 最初のユーザーの統計を取得（テスト用）
    if (users.length > 0) {
      const testUserId = users[0].id;
      console.log(`\n${users[0].name || users[0].email}さんの統計情報:`);

      // 登録商品数
      const productCount = await prisma.product.count({
        where: { userId: testUserId }
      });

      // 今月の売上統計
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyStats = await prisma.payment.aggregate({
        where: {
          userId: testUserId,
          status: 'confirmed',
          createdAt: {
            gte: monthStart,
            lte: new Date()
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // 総取引数
      const totalTransactions = await prisma.payment.count({
        where: { userId: testUserId }
      });

      console.log(`- 登録商品数: ${productCount}`);
      console.log(`- 今月の売上: ${parseFloat(monthlyStats._sum.amount?.toString() || '0') / 1_000_000} XYM`);
      console.log(`- 今月の取引数: ${monthlyStats._count.id}`);
      console.log(`- 総取引数: ${totalTransactions}`);

      // 商品一覧
      const products = await prisma.product.findMany({
        where: { userId: testUserId },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true
        }
      });

      console.log('\n登録商品一覧:');
      if (products.length === 0) {
        console.log('商品が登録されていません');
      } else {
        products.forEach((product, index) => {
          const price = parseFloat(product.price.toString()) / 1_000_000;
          console.log(`${index + 1}. ${product.name} - ${price} XYM (在庫: ${product.stock})`);
        });
      }

      // 確認済み取引の一覧
      const confirmedPayments = await prisma.payment.findMany({
        where: {
          userId: testUserId,
          status: 'confirmed'
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          product: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      console.log('\n最近の確認済み取引 (最新5件):');
      if (confirmedPayments.length === 0) {
        console.log('確認済み取引がありません');
      } else {
        confirmedPayments.forEach((payment, index) => {
          const amount = parseFloat(payment.amount.toString()) / 1_000_000;
          const date = payment.createdAt.toLocaleDateString('ja-JP');
          console.log(`${index + 1}. ${payment.product.name} - ${amount} XYM (${date})`);
        });
      }
    } else {
      console.log('\nユーザーが登録されていません');
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDashboardData().catch(console.error);
