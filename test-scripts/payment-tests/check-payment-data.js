const { PrismaClient } = require('@prisma/client');

async function checkPaymentData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 支払いデータを確認中...');

    // 最新の支払いデータを取得
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`\n✅ ${payments.length}件の支払いが見つかりました:\n`);

    payments.forEach((payment, index) => {
      console.log(`${index + 1}. 支払いID: ${payment.paymentId}`);
      console.log(`   商品: ${payment.product.name}`);
      console.log(`   XYM金額: ${payment.amount / 1000000} XYM`);
      console.log(`   状態: ${payment.status}`);
      
      if (payment.baseCurrencyAmount) {
        console.log(`   フィアット価値: ${payment.baseCurrencyAmount} ${payment.baseCurrency}`);
        console.log(`   レート: 1 XYM = ${payment.exchangeRate} ${payment.baseCurrency}`);
        console.log(`   プロバイダー: ${payment.rateProvider}`);
        console.log(`   レート時刻: ${payment.rateTimestamp}`);
      } else {
        console.log(`   フィアット価値: 未設定`);
      }
      console.log(`   作成日時: ${payment.createdAt}`);
      console.log('');
    });

    // 統計情報も取得
    const stats = await prisma.payment.aggregate({
      _sum: {
        amount: true,
        baseCurrencyAmount: true
      },
      _count: {
        id: true
      },
      where: {
        status: 'confirmed'
      }
    });

    console.log('📈 統計情報:');
    console.log(`   確認済み取引数: ${stats._count.id}`);
    console.log(`   総売上 (XYM): ${(stats._sum.amount || 0) / 1000000} XYM`);
    console.log(`   総売上 (フィアット): ${stats._sum.baseCurrencyAmount || 0} 円`);
    console.log('status:', payment.status);
    
    // 変換テスト
    const microXym = Number(payment.amount);
    const xym = microXym / 1000000;
    const formatted = Number(xym.toFixed(6)).toString();
    
    console.log('\n変換テスト:');
    console.log('microXym:', microXym);
    console.log('xym:', xym);
    console.log('formatted:', formatted);
    
    // 他の決済も確認
    const otherPayments = await prisma.payment.findMany({
      where: {
        paymentId: { in: ['7FTZIVNF', 'T0GPY1OK'] }
      },
      include: {
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });
    
    console.log('\n他の決済:');
    otherPayments.forEach(p => {
      console.log(`${p.paymentId}: ${p.amount} μXYM (${Number(p.amount) / 1000000} XYM) - ${p.product.name}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentData();
