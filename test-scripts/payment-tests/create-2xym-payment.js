const { PrismaClient } = require('@prisma/client');

async function createSmallAmountPayment() {
  const prisma = new PrismaClient();
  
  try {
    // 2 XYMの商品を探す
    const product = await prisma.product.findFirst({
      where: { 
        price: 2.00 
      },
      include: {
        user: {
          select: {
            addresses: {
              where: { isDefault: true },
              select: { id: true, address: true }
            }
          }
        }
      }
    });

    if (!product) {
      console.log('2 XYMの商品が見つかりません。商品を作成します...');
      
      // 最初のユーザーを取得
      const user = await prisma.user.findFirst({
        include: {
          addresses: {
            where: { isDefault: true },
            select: { id: true, address: true }
          }
        }
      });
      
      if (!user) {
        console.error('ユーザーが見つかりません');
        return;
      }
      
      // 2 XYMの商品を作成
      const newProduct = await prisma.product.create({
        data: {
          name: '2XYMテスト商品',
          price: 2.00,
          stock: 100,
          userId: user.id,
          paymentAddress: user.addresses[0]?.address || 'NDAPPH6ZGD4D6LBWFLGFZUT2KQ5OLBLU32K3HNY'
        }
      });
      
      console.log('2 XYMの商品を作成しました:', newProduct);
      
      // 作成した商品を使用
      const targetProduct = await prisma.product.findUnique({
        where: { id: newProduct.id },
        include: {
          user: {
            select: {
              addresses: {
                where: { isDefault: true },
                select: { id: true, address: true }
              }
            }
          }
        }
      });
      
      product = targetProduct;
    }

    console.log('📦 対象商品:');
    console.log(`  名前: ${product.name}`);
    console.log(`  価格: ${product.price} XYM`);
    console.log(`  UUID: ${product.uuid}`);

    // 決済作成
    const priceInXym = Number(product.price);
    const priceInMicroXym = Math.round(priceInXym * 1000000);
    
    console.log('🔄 決済作成処理:');
    console.log(`  商品価格（XYM）: ${priceInXym}`);
    console.log(`  マイクロXYM価格: ${priceInMicroXym}`);
    
    // 決済IDを生成
    const generateShortPaymentId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const paymentId = generateShortPaymentId();
    
    const defaultAddress = product.user.addresses[0]?.address || product.paymentAddress;
    const addressId = product.user.addresses[0]?.id;
    
    if (!addressId) {
      console.error('アドレスIDが見つかりません');
      return;
    }
    
    const payment = await prisma.payment.create({
      data: {
        paymentId: paymentId,
        productId: product.id,
        userId: null,
        addressId: addressId,
        amount: priceInMicroXym,
        status: 'pending',
        expireAt: new Date(Date.now() + 5 * 60 * 1000), // 5分後
        formData: {}
      }
    });

    console.log('💾 決済データ作成完了:');
    console.log(`  決済ID: ${payment.paymentId}`);
    console.log(`  保存された金額: ${payment.amount} μXYM`);
    console.log(`  XYM換算: ${payment.amount / 1000000} XYM`);
    console.log(`  状態: ${payment.status}`);
    
    console.log('🌐 決済URL:');
    console.log(`  http://localhost:3000/payment/session/${payment.paymentId}`);
    
    // 表示用変換テスト
    const displayAmount = Number((payment.amount / 1000000).toFixed(6)).toString();
    console.log('📺 表示用変換:');
    console.log(`  元の値: ${payment.amount} μXYM`);
    console.log(`  除算後: ${payment.amount / 1000000}`);
    console.log(`  toFixed(6): ${(payment.amount / 1000000).toFixed(6)}`);
    console.log(`  Number().toString(): ${displayAmount}`);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSmallAmountPayment();
