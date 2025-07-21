/**
 * 処理中決済の生成テストスクリプト
 * ダッシュボードの「処理中」表示をテストするため
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPendingPaymentTest() {
  try {
    console.log('=== 処理中決済生成テスト ===\n');
    
    // テストユーザーを取得
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    });
    
    if (!testUser) {
      console.log('❌ テストユーザーが見つかりません');
      return;
    }
    
    console.log('✅ テストユーザー:', testUser.email);
    
    // テスト商品を取得
    const testProduct = await prisma.product.findFirst({
      where: { userId: testUser.id }
    });
    
    if (!testProduct) {
      console.log('❌ テスト商品が見つかりません');
      return;
    }
    
    console.log('✅ テスト商品:', testProduct.name);
    
    // 受信アドレスを取得
    const address = await prisma.address.findFirst({
      where: { userId: testUser.id }
    });
    
    if (!address) {
      console.log('❌ 受信アドレスが見つかりません');
      return;
    }
    
    console.log('✅ 受信アドレス:', address.address);
    
    // 現在のpending決済数を確認
    const currentPendingCount = await prisma.payment.count({
      where: { 
        userId: testUser.id,
        status: 'pending' 
      }
    });
    
    console.log('現在の処理中決済数:', currentPendingCount);
    
    // 新しい処理中決済を作成
    const paymentId = `PENDING-TEST-${Date.now()}`;
    
    const newPendingPayment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: testProduct.id,
        userId: testUser.id,
        addressId: address.id,
        amount: 1500000000, // 1500 XYM
        status: 'pending',
        expireAt: new Date(Date.now() + 15 * 60 * 1000), // 15分後
        formData: {
          customerName: 'テスト顧客',
          email: 'test-customer@example.com',
          message: 'テスト決済（処理中）'
        }
      },
      include: {
        product: true
      }
    });
    
    console.log('\n✅ 新しい処理中決済を作成:');
    console.log('決済ID:', newPendingPayment.paymentId);
    console.log('商品:', newPendingPayment.product.name);
    console.log('金額:', (Number(newPendingPayment.amount) / 1000000).toLocaleString(), 'XYM');
    console.log('期限:', newPendingPayment.expireAt.toLocaleString());
    
    // 更新後のpending決済数を確認
    const updatedPendingCount = await prisma.payment.count({
      where: { 
        userId: testUser.id,
        status: 'pending' 
      }
    });
    
    console.log('\n更新後の処理中決済数:', updatedPendingCount);
    
    // ダッシュボード統計の確認
    console.log('\n=== ダッシュボード統計確認 ===');
    
    const [
      totalSales,
      totalTransactions,
      pendingPayments,
      errorCount
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId: testUser.id, status: 'confirmed' },
        _sum: { amount: true }
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
    
    console.log('売上:', (Number(totalSales._sum.amount || 0) / 1000000).toLocaleString(), 'XYM');
    console.log('取引数:', totalTransactions);
    console.log('処理中:', pendingPayments, '← この値がダッシュボードに表示されます');
    console.log('期限切れ・失敗:', errorCount);
    
    console.log('\n✅ ダッシュボードの「処理中」項目は実際のデータベースから取得されています');
    console.log('http://localhost:3001/dashboard で確認してください');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPendingPaymentTest().catch(console.error);
