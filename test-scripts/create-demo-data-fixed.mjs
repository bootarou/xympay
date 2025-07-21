import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function createDemoData() {
  console.log('=== デモデータの作成 ===');
  
  try {
    // 最初のユーザーを取得
    const user = await prisma.user.findFirst({
      where: { name: 'test' }
    });
    
    if (!user) {
      console.log('ユーザーが見つかりません');
      return;
    }
    
    console.log(`${user.name}さんのデモデータを作成します...`);
    
    // 1. アドレスを作成（まだ存在しない場合）
    console.log('1. アドレスを確認・作成...');
    let address = await prisma.address.findFirst({
      where: { userId: user.id }
    });
    
    if (!address) {
      address = await prisma.address.create({
        data: {
          name: 'デモアドレス',
          address: 'DEMO_ADDRESS_FOR_PAYMENT',
          type: 'payment',
          description: 'デモデータ用の支払いアドレス',
          isDefault: true,
          userId: user.id
        }
      });
      console.log('✓ デモアドレスを作成しました');
    } else {
      console.log('✓ 既存のアドレスを使用します');
    }
    
    // 2. 商品を作成
    console.log('2. 商品を作成...');
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: 'デモ商品1',
          price: new Prisma.Decimal('1000.00'),
          stock: 10,
          description: 'デモ商品1の説明',
          paymentAddress: address.address,
          userId: user.id
        }
      }),
      prisma.product.create({
        data: {
          name: 'デモ商品2',
          price: new Prisma.Decimal('2500.00'),
          stock: 5,
          description: 'デモ商品2の説明',
          paymentAddress: address.address,
          userId: user.id
        }
      }),
      prisma.product.create({
        data: {
          name: 'デモ商品3',
          price: new Prisma.Decimal('500.00'),
          stock: 20,
          description: 'デモ商品3の説明',
          paymentAddress: address.address,
          userId: user.id
        }
      })
    ]);
    
    console.log(`✓ ${products.length}個の商品を作成しました`);
    
    // 3. 今月の取引を作成
    console.log('3. 今月の取引を作成...');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 今月の取引を5件作成
    const thisMonthTransactions = [];
    for (let i = 0; i < 5; i++) {
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const transactionDate = new Date(currentYear, currentMonth, randomDay);
      const product = products[i % products.length];
      
      const payment = await prisma.payment.create({
        data: {
          paymentId: `DEMO${String(i + 1).padStart(4, '0')}`,
          amount: new Prisma.Decimal(product.price.toString()),
          status: 'confirmed',
          productId: product.id,
          userId: user.id,
          addressId: address.id,
          transactionId: `DEMO_TX_${Date.now()}_${i}`,
          senderAddress: `DEMO_ADDRESS_${i}`,
          confirmedAt: transactionDate,
          createdAt: transactionDate,
          expireAt: new Date(transactionDate.getTime() + 72 * 60 * 60 * 1000) // 72時間後
        }
      });
      
      thisMonthTransactions.push(payment);
    }
    
    console.log(`✓ 今月の取引を${thisMonthTransactions.length}件作成しました`);
    
    // 4. 過去の取引を作成
    console.log('4. 過去の取引を作成...');
    const pastTransactions = [];
    for (let i = 0; i < 10; i++) {
      const randomMonth = Math.floor(Math.random() * 12);
      const randomYear = currentYear - Math.floor(Math.random() * 2); // 過去2年以内
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const transactionDate = new Date(randomYear, randomMonth, randomDay);
      
      // 今月の取引は除外
      if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
        continue;
      }
      
      const product = products[i % products.length];
      
      const payment = await prisma.payment.create({
        data: {
          paymentId: `DEMO_PAST_${String(i + 1).padStart(4, '0')}`,
          amount: new Prisma.Decimal(product.price.toString()),
          status: 'confirmed',
          productId: product.id,
          userId: user.id,
          addressId: address.id,
          transactionId: `DEMO_PAST_TX_${Date.now()}_${i}`,
          senderAddress: `DEMO_PAST_ADDRESS_${i}`,
          confirmedAt: transactionDate,
          createdAt: transactionDate,
          expireAt: new Date(transactionDate.getTime() + 72 * 60 * 60 * 1000) // 72時間後
        }
      });
      
      pastTransactions.push(payment);
    }
    
    console.log(`✓ 過去の取引を${pastTransactions.length}件作成しました`);
    
    // 5. 統計情報を確認
    console.log('5. 作成されたデータの統計情報:');
    console.log(`- 商品数: ${products.length}`);
    console.log(`- 今月の取引数: ${thisMonthTransactions.length}`);
    console.log(`- 過去の取引数: ${pastTransactions.length}`);
    console.log(`- 総取引数: ${thisMonthTransactions.length + pastTransactions.length}`);
    
    const totalThisMonth = thisMonthTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
    console.log(`- 今月の売上: ${totalThisMonth.toLocaleString()} μXYM (${(totalThisMonth / 1000000).toFixed(2)} XYM)`);
    
    console.log('✓ デモデータの作成が完了しました！');
    
  } catch (error) {
    console.error('デモデータ作成中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoData();
