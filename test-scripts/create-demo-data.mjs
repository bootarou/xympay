import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDemoData() {
  console.log('=== デモデータの作成 ===\n');

  try {
    // 最初のユーザーを取得
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('ユーザーが見つかりません。先にアカウントを作成してください。');
      return;
    }

    console.log(`${user.name || user.email}さんのデモデータを作成します...`);

    // 1. 商品の作成
    console.log('\n1. 商品を作成...');
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: 'デジタル商品A',
          price: 1000000, // 1 XYM
          stock: 100,
          description: 'テスト用デジタル商品です',
          userId: user.id
        }
      }),
      prisma.product.create({
        data: {
          name: 'サービスB',
          price: 500000, // 0.5 XYM
          stock: 50,
          description: 'テスト用サービスです',
          userId: user.id
        }
      }),
      prisma.product.create({
        data: {
          name: 'プレミアム商品C',
          price: 2000000, // 2 XYM
          stock: 10,
          description: 'プレミアム商品です',
          userId: user.id
        }
      })
    ]);

    console.log(`✓ ${products.length}個の商品を作成しました`);

    // 2. 取引の作成（今月分）
    console.log('\n2. 今月の取引を作成...');
    const thisMonth = new Date();
    thisMonth.setDate(1); // 今月の1日

    const payments = [];
    
    // 確認済み取引
    for (let i = 0; i < 5; i++) {
      const product = products[i % products.length];
      const payment = await prisma.payment.create({
        data: {
          paymentId: `DEMO${String(i + 1).padStart(4, '0')}`,
          amount: product.price,
          status: 'confirmed',
          productId: product.id,
          userId: user.id,
          transactionId: `DEMO_TX_${Date.now()}_${i}`,
          senderAddress: `DEMO_ADDRESS_${i}`,
          confirmedAt: new Date(thisMonth.getTime() + (i * 24 * 60 * 60 * 1000)),
          createdAt: new Date(thisMonth.getTime() + (i * 24 * 60 * 60 * 1000)),
          expireAt: new Date(Date.now() + 30 * 60 * 1000) // 30分後
        }
      });
      payments.push(payment);
    }

    // 期限切れ取引
    for (let i = 0; i < 3; i++) {
      const product = products[i % products.length];
      const payment = await prisma.payment.create({
        data: {
          paymentId: `EXPIRED${String(i + 1).padStart(3, '0')}`,
          amount: product.price,
          status: 'expired',
          productId: product.id,
          userId: user.id,
          createdAt: new Date(thisMonth.getTime() + ((i + 10) * 24 * 60 * 60 * 1000)),
          expireAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1日前に期限切れ
        }
      });
      payments.push(payment);
    }

    console.log(`✓ ${payments.length}個の取引を作成しました`);

    // 3. 統計情報の確認
    console.log('\n3. 作成後の統計情報...');
    
    const productCount = await prisma.product.count({
      where: { userId: user.id }
    });

    const monthlyStats = await prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'confirmed',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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

    const totalTransactions = await prisma.payment.count({
      where: { userId: user.id }
    });

    console.log(`- 登録商品数: ${productCount}`);
    console.log(`- 今月の売上: ${parseFloat(monthlyStats._sum.amount?.toString() || '0') / 1_000_000} XYM`);
    console.log(`- 今月の取引数: ${monthlyStats._count.id}`);
    console.log(`- 総取引数: ${totalTransactions}`);

    console.log('\n✓ デモデータの作成が完了しました！');
    console.log('ダッシュボード (/home) にアクセスして確認してください。');

  } catch (error) {
    console.error('デモデータ作成中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoData().catch(console.error);
