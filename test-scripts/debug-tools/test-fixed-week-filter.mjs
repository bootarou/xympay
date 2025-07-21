// 修正後の今週フィルター検証スクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFixedWeekFilter() {
  console.log('=== 修正後の今週フィルターロジック検証 ===');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log('現在時刻:', now.toISOString());
  console.log('今日:', today.toISOString());
  
  // 修正後の「今週」ロジック（月曜日〜日曜日）
  const dayOfWeek = today.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日からの日数
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - daysFromMonday);
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);
  
  console.log('\n=== 修正後の今週ロジック ===');
  console.log('今日の曜日:', ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]);
  console.log('月曜日からの日数:', daysFromMonday);
  console.log('今週開始:', thisWeekStart.toISOString());
  console.log('今週終了:', thisWeekEnd.toISOString());
  
  // データベースで検証
  const weekData = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: thisWeekStart,
        lte: thisWeekEnd
      }
    },
    select: {
      id: true,
      paymentId: true,
      createdAt: true,
      status: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log('\n=== 今週のデータ ===');
  console.log('件数:', weekData.length);
  if (weekData.length > 0) {
    weekData.forEach(payment => {
      console.log(`${payment.paymentId}: ${payment.createdAt.toISOString()} (${payment.status})`);
    });
  } else {
    console.log('今週のデータはありません');
  }
  
  // 全期間での最新データを確認
  const allData = await prisma.payment.findMany({
    select: {
      id: true,
      paymentId: true,
      createdAt: true,
      status: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n=== 全期間の最新データ（上位10件） ===');
  allData.forEach(payment => {
    const date = new Date(payment.createdAt);
    const isThisWeek = date >= thisWeekStart && date <= thisWeekEnd;
    console.log(`${payment.paymentId}: ${payment.createdAt.toISOString()} (${payment.status}) ${isThisWeek ? '📅 今週' : ''}`);
  });
  
  // 統計情報も確認
  const weekStats = await prisma.payment.aggregate({
    where: {
      createdAt: {
        gte: thisWeekStart,
        lte: thisWeekEnd
      },
      status: 'confirmed'
    },
    _sum: {
      amount: true
    },
    _count: {
      id: true
    }
  });
  
  console.log('\n=== 今週の統計（確認済みのみ） ===');
  console.log('確認済み取引数:', weekStats._count.id);
  console.log('総額:', weekStats._sum.amount || 0, 'XYM');
}

testFixedWeekFilter()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
