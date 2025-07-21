import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFormatAmountFunction() {
  console.log('=== formatAmount関数のテスト ===\n');

  // formatAmount関数をシミュレート（改良版）
  const formatAmount = (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0';
    
    const xymAmount = numAmount / 1_000_000;
    
    // 金額に応じて小数点桁数を調整
    let maximumFractionDigits = 6;
    if (xymAmount >= 1) {
      maximumFractionDigits = 2; // 1 XYM以上は小数点以下2桁
    } else if (xymAmount >= 0.01) {
      maximumFractionDigits = 4; // 0.01 XYM以上は小数点以下4桁
    } else {
      maximumFractionDigits = 6; // それ未満は小数点以下6桁
    }
    
    return new Intl.NumberFormat("ja-JP", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(xymAmount);
  };

  // テストケース
  const testAmounts = [
    2000000, // 2 XYM
    1000000, // 1 XYM
    500000,  // 0.5 XYM
    10000,   // 0.01 XYM
    1000,    // 0.001 XYM
    100,     // 0.0001 XYM
    2,       // 0.000002 XYM
    2000024, // 2.000024 XYM
    153848,  // 0.153848 XYM
  ];

  console.log('フォーマット結果:');
  testAmounts.forEach(amount => {
    console.log(`${amount.toLocaleString()} μXYM → ${formatAmount(amount)} XYM`);
  });

  // 実際のDBデータでテスト
  try {
    const stats = await prisma.payment.aggregate({
      where: { status: 'confirmed' },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true }
    });

    console.log('\n実際のDB統計:');
    console.log(`総売上: ${formatAmount(parseFloat(stats._sum.amount?.toString() || '0'))} XYM`);
    console.log(`平均取引額: ${formatAmount(parseFloat(stats._avg.amount?.toString() || '0'))} XYM`);
    console.log(`取引数: ${stats._count.id}`);

  } catch (error) {
    console.error('DBアクセスエラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFormatAmountFunction().catch(console.error);
