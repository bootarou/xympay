/**
 * ダッシュボード表示用のテストデータ生成スクリプト
 * 各種ステータスの決済を作成してダッシュボード表示をテスト
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDashboardTestData() {
  try {
    console.log('=== ダッシュボードテストデータ生成 ===\n');
    
    // テストユーザーを取得
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    });
    
    if (!testUser) {
      console.log('❌ テストユーザーが見つかりません');
      return;
    }
    
    // テスト商品を取得
    const testProduct = await prisma.product.findFirst({
      where: { userId: testUser.id }
    });
    
    if (!testProduct) {
      console.log('❌ テスト商品が見つかりません');
      return;
    }
    
    // 受信アドレスを取得
    const address = await prisma.address.findFirst({
      where: { userId: testUser.id }
    });
    
    if (!address) {
      console.log('❌ 受信アドレスが見つかりません');
      return;
    }
    
    console.log('✅ テストユーザー:', testUser.email);
    console.log('✅ テスト商品:', testProduct.name);
    
    // 処理中決済を追加作成
    const pendingPayments = [];
    
    for (let i = 0; i < 3; i++) {
      const paymentId = `PENDING-MULTI-${Date.now()}-${i}`;
      const amount = (1000 + Math.random() * 4000) * 1000000; // 1000-5000 XYM
      
      const payment = await prisma.payment.create({
        data: {
          paymentId: paymentId,
          productId: testProduct.id,
          userId: testUser.id,
          addressId: address.id,
          amount: Math.floor(amount),
          status: 'pending',
          expireAt: new Date(Date.now() + (10 + i * 5) * 60 * 1000), // 10-20分後
          formData: {
            customerName: `テスト顧客${i + 1}`,
            email: `test-customer-${i + 1}@example.com`,
            note: `処理中テスト決済 #${i + 1}`
          }
        }
      });
      
      pendingPayments.push(payment);
      console.log(`✅ 処理中決済 ${i + 1}: ${paymentId} (${(Number(payment.amount) / 1000000).toFixed(0)} XYM)`);
    }
    
    // 確認済み決済も作成（売上表示用）
    const confirmedPayments = [];
    
    for (let i = 0; i < 5; i++) {
      const paymentId = `CONFIRMED-TEST-${Date.now()}-${i}`;
      const amount = (500 + Math.random() * 2500) * 1000000; // 500-3000 XYM
      const confirmedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // 過去7日以内
      
      const payment = await prisma.payment.create({
        data: {
          paymentId: paymentId,
          productId: testProduct.id,
          userId: testUser.id,
          addressId: address.id,
          amount: Math.floor(amount),
          status: 'confirmed',
          confirmedAt: confirmedAt,
          transactionId: `TX${Date.now()}${i}`,
          senderAddress: 'NTEST' + Math.random().toString(36).substring(2, 39).toUpperCase(),
          exchangeRate: 12.56 + Math.random() * 2, // JPY/XYM
          baseCurrency: 'JPY',
          baseCurrencyAmount: Math.floor(amount / 1000000 * (12.56 + Math.random() * 2)),
          rateProvider: 'coingecko',
          rateTimestamp: confirmedAt,
          expireAt: new Date(confirmedAt.getTime() + 15 * 60 * 1000),
          formData: {
            customerName: `顧客${i + 1}`,
            email: `customer-${i + 1}@example.com`
          }
        }
      });
      
      confirmedPayments.push(payment);
      console.log(`✅ 確認済み決済 ${i + 1}: ${paymentId} (${(Number(payment.amount) / 1000000).toFixed(0)} XYM)`);
    }
    
    // 現在の統計を確認
    console.log('\n=== 更新後のダッシュボード統計 ===');
    
    const [
      totalSales,
      totalBaseCurrencySales,
      totalTransactions,
      pendingCount,
      errorCount
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId: testUser.id, status: 'confirmed' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { 
          userId: testUser.id, 
          status: 'confirmed',
          baseCurrencyAmount: { not: null }
        },
        _sum: { baseCurrencyAmount: true }
      }),
      prisma.payment.count({
        where: { userId: testUser.id, status: 'confirmed' }
      }),
      prisma.payment.count({
        where: { userId: testUser.id, status: 'pending' }
      }),
      prisma.payment.count({
        where: { userId: testUser.id, status: { in: ['expired', 'cancelled'] } }
      })
    ]);
    
    const totalSalesXYM = Number(totalSales._sum.amount || 0) / 1000000;
    const totalBaseCurrencyValue = Number(totalBaseCurrencySales._sum.baseCurrencyAmount || 0);
    
    console.log(`📈 今月の売上: ${totalSalesXYM.toLocaleString()} XYM`);
    console.log(`💰 売上 (税務用): ¥${totalBaseCurrencyValue.toLocaleString()}`);
    console.log(`📊 総取引数: ${totalTransactions}件`);
    console.log(`⏳ 処理中: ${pendingCount}件 ← ダッシュボードで確認できます`);
    console.log(`❌ 期限切れ・失敗: ${errorCount}件`);
    
    console.log('\n✅ テストデータ生成完了');
    console.log('ダッシュボード (http://localhost:3001/dashboard) でリアルタイムデータを確認してください');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateDashboardTestData().catch(console.error);
