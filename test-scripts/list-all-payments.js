const { PrismaClient } = require('@prisma/client');

async function listAllPayments() {
  const prisma = new PrismaClient();
  
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });

    console.log('最新の決済データ:');
    payments.forEach(payment => {
      const microXym = Number(payment.amount);
      const xym = microXym / 1000000;
      const formatted = Number(xym.toFixed(6)).toString();
      
      console.log(`${payment.paymentId}: ${payment.amount} μXYM → ${formatted} XYM (商品: ${payment.product.name}, 価格: ${payment.product.price})`);
    });

    // H5KA1XN6を含む検索
    const h5Payment = await prisma.payment.findFirst({
      where: {
        paymentId: { contains: 'H5KA' }
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

    if (h5Payment) {
      console.log('\nH5KA関連の決済:');
      console.log(`${h5Payment.paymentId}: ${h5Payment.amount} μXYM`);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllPayments();
