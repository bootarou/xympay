/**
 * テスト用の支払いを直接データベースに作成するスクリプト
 */

const { PrismaClient } = require('@prisma/client');

async function createTestPayment() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 テスト支払いを作成中...');

    // 既存のユーザーと商品とアドレスを取得
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }

    const product = await prisma.product.findFirst({
      where: { userId: user.id }
    });
    if (!product) {
      console.log('❌ 商品が見つかりません');
      return;
    }

    const address = await prisma.address.findFirst({
      where: { userId: user.id }
    });
    if (!address) {
      console.log('❌ アドレスが見つかりません');
      return;
    }

    // 現在のXYM/JPYレートを模擬（実際の実装では exchange-rate plugin を使用）
    const mockExchangeRate = 15.50; // 1 XYM = 15.50 JPY
    const xymAmount = Number(product.price); // microXYM
    const baseCurrencyAmount = Math.round((xymAmount / 1000000) * mockExchangeRate);

    // テスト支払いを作成
    const testPayment = await prisma.payment.create({
      data: {
        paymentId: `TEST_${Date.now()}`,
        userId: user.id,
        productId: product.id,
        addressId: address.id,
        amount: xymAmount,
        status: 'confirmed',
        senderAddress: 'NDU2FZVFHYWFZHPWJZG6LTYHBJ27VA7E2RHGEZRA',
        transactionId: `TEST_HASH_${Date.now()}`,
        confirmedAt: new Date(),
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        baseCurrencyAmount: baseCurrencyAmount,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        rateProvider: 'TEST_PROVIDER',
        rateTimestamp: new Date(),
      }
    });

    console.log('✅ テスト支払いを作成しました:');
    console.log(`   支払いID: ${testPayment.paymentId}`);
    console.log(`   XYM金額: ${xymAmount / 1000000} XYM`);
    console.log(`   フィアット価値: ${baseCurrencyAmount} JPY`);
    console.log(`   レート: 1 XYM = ${mockExchangeRate} JPY`);

    console.log('\n📊 ダッシュボードを確認してください:');
    console.log(`🔗 http://localhost:3001/dashboard`);
    console.log(`🔗 http://localhost:3001/dashboard/transaction/${testPayment.paymentId}`);

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPayment();
