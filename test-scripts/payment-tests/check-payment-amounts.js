const { PrismaClient } = require('@prisma/client');

async function checkPaymentAmounts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking payment amounts in database...');
    
    const payments = await prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
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
    
    console.log('\nPayment amounts:');
    payments.forEach(payment => {
      console.log(`- ${payment.paymentId}: amount=${payment.amount} (${typeof payment.amount}), product_price=${payment.product.price}, status=${payment.status}`);
    });
    
    const confirmed = await prisma.payment.findMany({
      where: { status: 'confirmed' },
      take: 5,
      select: {
        paymentId: true,
        amount: true,
        status: true
      }
    });
    
    console.log('\nConfirmed payments:');
    confirmed.forEach(payment => {
      console.log(`- ${payment.paymentId}: amount=${payment.amount} (${typeof payment.amount})`);
    });
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentAmounts();
