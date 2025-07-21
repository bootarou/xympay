// 今週フィルターのロジック検証スクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWeekFilter() {
  console.log('=== 今週フィルターロジック検証 ===');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log('現在時刻:', now.toISOString());
  console.log('今日 (today):', today.toISOString());
  
  // 現在のコード（過去7日間）
  const currentWeekAgo = new Date(today);
  currentWeekAgo.setDate(today.getDate() - 7);
  const currentTodayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  console.log('\n=== 現在のロジック（過去7日間） ===');
  console.log('開始:', currentWeekAgo.toISOString());
  console.log('終了:', currentTodayEnd.toISOString());
  
  // より正確な「今週」ロジック（月曜日〜日曜日）
  const dayOfWeek = today.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日からの日数
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - daysFromMonday);
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);
  
  console.log('\n=== 改善後のロジック（今週の月曜日〜日曜日） ===');
  console.log('開始:', thisWeekStart.toISOString());
  console.log('終了:', thisWeekEnd.toISOString());
  
  // データベースで実際のデータを確認
  console.log('\n=== データベース内のデータ確認 ===');
  
  // 現在のロジックでの取得結果
  const currentResults = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: currentWeekAgo,
        lte: currentTodayEnd
      }
    },
    select: {
      id: true,
      paymentId: true,
      createdAt: true,
      status: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n現在のロジックでの結果（上位10件）:');
  currentResults.forEach(payment => {
    console.log(`${payment.paymentId}: ${payment.createdAt.toISOString()} (${payment.status})`);
  });
  
  // 改善後のロジックでの取得結果
  const improvedResults = await prisma.payment.findMany({
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
    take: 10
  });
  
  console.log('\n改善後のロジックでの結果（上位10件）:');
  improvedResults.forEach(payment => {
    console.log(`${payment.paymentId}: ${payment.createdAt.toISOString()} (${payment.status})`);
  });
  
  // 未来のデータがあるかチェック
  const futureData = await prisma.payment.findMany({
    where: {
      createdAt: {
        gt: now
      }
    },
    select: {
      id: true,
      paymentId: true,
      createdAt: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== 未来のデータ（問題データ） ===');
  console.log('件数:', futureData.length);
  if (futureData.length > 0) {
    futureData.slice(0, 5).forEach(payment => {
      console.log(`${payment.paymentId}: ${payment.createdAt.toISOString()} (${payment.status})`);
    });
  }
}

testWeekFilter()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
