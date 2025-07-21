const { PrismaClient } = require('@prisma/client');

async function testPaymentAmountConversion() {
  const prisma = new PrismaClient();
  
  try {
    // 既存の商品を確認
    const products = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        uuid: true,
        name: true,
        price: true,
        paymentAddress: true,
        user: {
          select: {
            addresses: {
              where: { isDefault: true },
              select: { address: true }
            }
          }
        }
      }
    });

    console.log('📦 商品データ:');
    products.forEach(product => {
      console.log(`  - ${product.name}: ${product.price} XYM`);
      console.log(`    UUID: ${product.uuid}`);
      console.log(`    住所: ${product.user.addresses[0]?.address || product.paymentAddress}`);
    });

    // 決済作成時の金額変換をテスト
    console.log('\n💰 金額変換テスト:');
    const testPrice = 100.50; // 100.50 XYM
    const priceInMicroXym = Math.round(testPrice * 1000000);
    console.log(`  XYM価格: ${testPrice}`);
    console.log(`  マイクロXYM価格: ${priceInMicroXym}`);
    console.log(`  戻し変換: ${priceInMicroXym / 1000000}`);

    // 既存の決済データを確認
    const payments = await prisma.payment.findMany({
      take: 5,
      select: {
        paymentId: true,
        amount: true,
        status: true,
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });

    console.log('\n💳 決済データ:');
    payments.forEach(payment => {
      console.log(`  - ${payment.paymentId}: ${payment.amount} μXYM (${payment.amount / 1000000} XYM)`);
      console.log(`    商品: ${payment.product.name} (${payment.product.price} XYM)`);
      console.log(`    状態: ${payment.status}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentAmountConversion();
