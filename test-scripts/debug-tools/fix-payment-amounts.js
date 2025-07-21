const { PrismaClient } = require('@prisma/client');

async function fixPaymentAmounts() {
  const prisma = new PrismaClient();
  
  try {
    // 間違った金額の決済を探す（2000000000000のようなもの）
    const payments = await prisma.payment.findMany({
      where: {
        amount: { gte: 1000000000 } // 10億以上は明らかに間違い
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

    console.log('修正対象の決済:');
    for (const payment of payments) {
      const currentAmount = Number(payment.amount);
      const productPrice = Number(payment.product.price);
      
      console.log(`${payment.paymentId}: ${currentAmount} μXYM (商品: ${payment.product.name}, 価格: ${productPrice})`);
      
      // 修正後の金額を計算
      let correctedAmount;
      if (productPrice >= 1000000) {
        // 商品価格が既にマイクロXYM単位
        correctedAmount = Math.round(productPrice);
      } else {
        // 商品価格がXYM単位
        correctedAmount = Math.round(productPrice * 1000000);
      }
      
      console.log(`  修正後: ${correctedAmount} μXYM (${correctedAmount / 1000000} XYM)`);
      
      // 修正を実行
      await prisma.payment.update({
        where: { id: payment.id },
        data: { amount: correctedAmount }
      });
      
      console.log(`  ✅ 修正完了`);
    }

    console.log('\n修正完了！');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentAmounts();
