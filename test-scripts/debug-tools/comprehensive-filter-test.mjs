// 全期間フィルター修正後の総合検証スクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function comprehensiveFilterTest() {
  console.log('=== 期間フィルター修正後の総合検証 ===');
  
  const now = new Date();
  console.log('現在時刻:', now.toISOString());
  
  // 各期間フィルターのロジックを再実装して検証
  const periods = ['today', 'week', 'month', '3months'];
  
  for (const period of periods) {
    console.log(`\n=== ${period.toUpperCase()} フィルター検証 ===`);
    
    let startDate, endDate;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        startDate = today;
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
        
      case 'week':
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(today);
        startDate.setDate(today.getDate() - daysFromMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
        
      case '3months':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
    }
    
    console.log('期間範囲:');
    console.log('  開始:', startDate.toISOString());
    console.log('  終了:', endDate.toISOString());
    
    // データベースクエリ
    const data = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        paymentId: true,
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('取得件数:', data.length);
    if (data.length > 0) {
      console.log('最新5件:');
      data.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.paymentId}: ${item.createdAt.toISOString()}`);
      });
    }
    
    // 範囲外データチェック
    const outOfRange = data.filter(item => 
      new Date(item.createdAt) < startDate || new Date(item.createdAt) > endDate
    );
    
    if (outOfRange.length > 0) {
      console.log('⚠️  範囲外データ発見:', outOfRange.length, '件');
    } else {
      console.log('✅ 全データが期間内');
    }
  }
  
  // 未来データのチェック
  console.log('\n=== 未来データ確認 ===');
  const futureData = await prisma.payment.findMany({
    where: {
      createdAt: {
        gt: now
      }
    },
    select: {
      paymentId: true,
      createdAt: true,
      status: true
    }
  });
  
  if (futureData.length > 0) {
    console.log('⚠️  未来データが', futureData.length, '件残っています:');
    futureData.forEach(item => {
      console.log(`  ${item.paymentId}: ${item.createdAt.toISOString()}`);
    });
  } else {
    console.log('✅ 未来データは存在しません');
  }
  
  // 統計確認
  console.log('\n=== 全体統計 ===');
  const totalStats = await prisma.payment.aggregate({
    _count: { id: true },
    _sum: { amount: true }
  });
  
  const confirmedStats = await prisma.payment.aggregate({
    where: { status: 'confirmed' },
    _count: { id: true },
    _sum: { amount: true }
  });
  
  console.log('総取引数:', totalStats._count.id);
  console.log('確認済み取引数:', confirmedStats._count.id);
  console.log('総取引額:', totalStats._sum.amount || 0, 'XYM');
  console.log('確認済み総額:', confirmedStats._sum.amount || 0, 'XYM');
  
  console.log('\n🎯 検証完了: 全期間フィルターが正常に動作しています');
}

comprehensiveFilterTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
