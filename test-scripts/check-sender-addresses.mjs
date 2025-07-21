import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSenderAddresses() {
  console.log('=== 送信者アドレスの確認 ===\n');

  try {
    // 完了済みの決済で送信者アドレスがあるものを確認
    const payments = await prisma.payment.findMany({
      where: {
        status: 'confirmed'
      },
      select: {
        paymentId: true,
        status: true,
        senderAddress: true,
        transactionId: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'desc'
      },
      take: 10
    });

    console.log(`確認済み決済数: ${payments.length}\n`);

    payments.forEach((payment, index) => {
      console.log(`=== 決済 ${index + 1} ===`);
      console.log(`決済ID: ${payment.paymentId}`);
      console.log(`商品名: ${payment.product.name}`);
      console.log(`ステータス: ${payment.status}`);
      console.log(`送信者アドレス: ${payment.senderAddress || '未設定'}`);
      console.log(`トランザクションID: ${payment.transactionId || '未設定'}`);
      console.log('');
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSenderAddresses().catch(console.error);
