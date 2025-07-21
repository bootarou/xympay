import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function addPendingPayments() {
  console.log('=== 保留中の取引を追加 ===');
  
  try {
    // 最初のユーザーを取得
    const user = await prisma.user.findFirst({
      where: { name: 'test' }
    });
    
    if (!user) {
      console.log('ユーザーが見つかりません');
      return;
    }
    
    // アドレスを取得
    const address = await prisma.address.findFirst({
      where: { userId: user.id }
    });
    
    if (!address) {
      console.log('アドレスが見つかりません');
      return;
    }
    
    // 商品を取得
    const products = await prisma.product.findMany({
      where: { userId: user.id },
      take: 3
    });
    
    if (products.length === 0) {
      console.log('商品が見つかりません');
      return;
    }
    
    console.log(`${user.name}さんの保留中の取引を作成します...`);
    
    // 保留中の取引を2件作成
    for (let i = 0; i < 2; i++) {
      const product = products[i % products.length];
      
      const payment = await prisma.payment.create({
        data: {
          paymentId: `PENDING_${String(i + 1).padStart(4, '0')}`,
          amount: new Prisma.Decimal(product.price.toString()),
          status: 'pending',
          productId: product.id,
          userId: user.id,
          addressId: address.id,
          expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後
        }
      });
      
      console.log(`✓ 保留中の取引を作成: ${payment.paymentId} - ${product.name} - ${payment.amount.toString()} μXYM`);
    }
    
    // 期限切れの取引を1件作成
    const expiredProduct = products[0];
    const expiredPayment = await prisma.payment.create({
      data: {
        paymentId: `EXPIRED_0001`,
        amount: new Prisma.Decimal(expiredProduct.price.toString()),
        status: 'expired',
        productId: expiredProduct.id,
        userId: user.id,
        addressId: address.id,
        expireAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間前
      }
    });
    
    console.log(`✓ 期限切れの取引を作成: ${expiredPayment.paymentId} - ${expiredProduct.name} - ${expiredPayment.amount.toString()} μXYM`);
    
    console.log('\n✅ 保留中・期限切れの取引の追加が完了しました！');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPendingPayments();
