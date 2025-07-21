import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyStatsDisplay() {
  console.log('=== 統計情報表示の最終確認 ===\n');

  try {
    // 確認済み取引の統計情報を直接取得
    const stats = await prisma.payment.aggregate({
      where: { 
        status: 'confirmed' 
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
      _count: {
        id: true,
      }
    });

    console.log('DB直接アクセスの結果:');
    console.log('- 総取引数:', stats._count.id);
    console.log('- 総売上 (μXYM):', stats._sum.amount?.toString() || '0');
    console.log('- 平均金額 (μXYM):', stats._avg.amount?.toString() || '0');

    // μXYMからXYMに変換
    const totalAmountXYM = parseFloat(stats._sum.amount?.toString() || '0') / 1_000_000;
    const averageAmountXYM = parseFloat(stats._avg.amount?.toString() || '0') / 1_000_000;

    console.log('\nXYM変換後:');
    console.log('- 総売上 (XYM):', totalAmountXYM.toFixed(6));
    console.log('- 平均金額 (XYM):', averageAmountXYM.toFixed(6));

    // APIレスポンス形式での確認
    const apiStats = {
      totalAmount: parseFloat(stats._sum.amount?.toString() || '0'),
      averageAmount: parseFloat(stats._avg.amount?.toString() || '0'),
      confirmedTransactionCount: stats._count.id,
    };

    console.log('\nAPI形式のstats:');
    console.log(JSON.stringify(apiStats, null, 2));

    // formatAmount関数をシミュレート
    const formatAmount = (amount) => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount)) return '0';
      const xymAmount = numAmount / 1_000_000;
      return new Intl.NumberFormat("ja-JP", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }).format(xymAmount);
    };

    console.log('\nフロントエンド表示結果:');
    console.log('- 総売上:', formatAmount(apiStats.totalAmount), 'XYM');
    console.log('- 平均取引額:', formatAmount(apiStats.averageAmount), 'XYM');
    console.log('- 取引数:', apiStats.confirmedTransactionCount);

    // 確認済み取引の詳細を少し表示
    const confirmedTransactions = await prisma.payment.findMany({
      where: { status: 'confirmed' },
      take: 5,
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
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n直近の確認済み取引:');
    confirmedTransactions.forEach((tx, index) => {
      const amountXYM = parseFloat(tx.amount.toString()) / 1_000_000;
      console.log(`${index + 1}. ${tx.product.name}: ${amountXYM.toFixed(6)} XYM (${tx.createdAt.toISOString().split('T')[0]})`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyStatsDisplay().catch(console.error);
