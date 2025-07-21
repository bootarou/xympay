// 手動で決済データを作成するスクリプト
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createTestPayment() {
  try {
    console.log('テスト決済を作成中...');
    
    // 商品を取得
    const product = await prisma.product.findFirst({
      where: {
        uuid: '9b902bab-b401-489f-bc40-fe3bfd8358e5'
      },      include: {
        user: {
          include: {
            addresses: {
              where: { isDefault: true }
            }
          }
        },
        customFields: true
      }
    });

    if (!product) {
      console.error('商品が見つかりません');
      return;
    }    console.log('商品:', product.name);
    console.log('カスタムフィールド数:', product.customFields.length);
    console.log('ユーザーアドレス:', product.user.addresses[0]?.address);    // 決済IDを生成
    const paymentId = randomUUID();
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // Step1用に15分後

    // 決済を作成
    const payment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: product.id,
        userId: null,
        addressId: product.user.addresses[0]?.id,
        amount: Number(product.price),
        status: 'pending',
        expireAt: expireAt,
        formData: {} // 空のフォームデータ（カスタムフィールドのテスト用）
      }
    });

    console.log('決済作成成功:');
    console.log('PaymentID:', paymentId);
    console.log('決済URL:', `http://localhost:3000/payment/${paymentId}`);
    
    return paymentId;
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPayment();
