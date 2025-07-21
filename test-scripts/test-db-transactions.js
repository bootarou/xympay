const { PrismaClient } = require('@prisma/client');

async function testDBConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection and transactions...');
    
    const transactions = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        paymentId: true,
        status: true,
        amount: true,
        transactionId: true,
        senderAddress: true,
        message: true,
        confirmedAt: true,
        createdAt: true,
        expireAt: true,
        userId: true,
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });
    
    console.log('Found transactions:', transactions.length);
    
    if (transactions.length > 0) {
      console.log('\nSample transaction:');
      console.log(JSON.stringify(transactions[0], null, 2));
    }
    
    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\nStatus distribution:');
    statusCounts.forEach(s => {
      console.log(`- ${s.status}: ${s._count.status} transactions`);
    });
    
  } catch (error) {
    console.error('Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDBConnection();
