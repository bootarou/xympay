const { PrismaClient } = require('@prisma/client');

async function checkProductPrices() {
  const prisma = new PrismaClient();
  
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        price: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('商品価格の確認:');
    products.forEach(product => {
      const price = Number(product.price);
      console.log(`${product.name}: ${price} (${price >= 1000000 ? '既にμXYM単位?' : 'XYM単位?'})`);
    });

    // 特定の商品を確認
    const storeProduct = await prisma.product.findFirst({
      where: { name: '店頭決済用' }
    });

    if (storeProduct) {
      console.log('\n店頭決済用商品:');
      console.log('価格:', storeProduct.price);
      console.log('Number変換:', Number(storeProduct.price));
      console.log('単位推定:', Number(storeProduct.price) >= 1000000 ? 'μXYM単位と推定' : 'XYM単位と推定');
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductPrices();
