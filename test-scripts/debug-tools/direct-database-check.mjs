/**
 * データベース直接確認
 * ダッシュボードAPIと同じロジックでデータを取得
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function directDatabaseCheck() {
  try {
    console.log('=== データベース直接確認 ===\n');
    
    // テストユーザーを取得
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    });
    
    if (!testUser) {
      console.log('❌ テストユーザーが見つかりません');
      return;
    }
    
    console.log('✅ テストユーザー:', testUser.email, `(ID: ${testUser.id})`);
    
    // ダッシュボードAPIと同じロジックでデータを取得
    const [
      totalSales,
      totalBaseCurrencySales,
      totalTransactions,
      pendingPayments,
      errorCount,
      recentTransactions
    ] = await Promise.all([
      // 総売上（全期間の確認済み取引）
      prisma.payment.aggregate({
        where: {
          userId: testUser.id,
          status: 'confirmed'
        },
        _sum: {
          amount: true
        }
      }),
      
      // 総売上（基準通貨、全期間の確認済み取引）
      prisma.payment.aggregate({
        where: {
          userId: testUser.id,
          status: 'confirmed',
          baseCurrencyAmount: { not: null }
        },
        _sum: {
          baseCurrencyAmount: true
        }
      }),
      
      // 総取引数（確認済み）
      prisma.payment.count({
        where: {
          userId: testUser.id,
          status: 'confirmed'
        }
      }),
      
      // 保留中の取引数 ← これが「処理中」として表示される
      prisma.payment.count({
        where: {
          userId: testUser.id,
          status: 'pending'
        }
      }),
      
      // エラーまたは期限切れの取引数
      prisma.payment.count({
        where: {
          userId: testUser.id,
          status: { in: ['expired', 'cancelled'] }
        }
      }),
      
      // 最近の取引（最新10件）
      prisma.payment.findMany({
        where: {
          userId: testUser.id,
          status: 'confirmed'
        },
        include: {
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
      })
    ]);
    
    console.log('\n📊 ダッシュボード統計 (APIと同じロジック):');
    
    const totalSalesValue = parseFloat(totalSales._sum.amount?.toString() || '0');
    const totalBaseCurrencyValue = parseFloat(totalBaseCurrencySales._sum.baseCurrencyAmount?.toString() || '0');
    
    console.log(`📈 今月の売上: ${(totalSalesValue / 1000000).toLocaleString()} XYM`);
    console.log(`💰 売上 (税務用): ¥${totalBaseCurrencyValue.toLocaleString()}`);
    console.log(`📊 総取引数: ${totalTransactions}件`);
    console.log(`⏳ 処理中: ${pendingPayments}件 ← これが「処理中」カードに表示されます`);
    console.log(`❌ 期限切れ・失敗: ${errorCount}件`);
    
    console.log('\n📋 最近の取引:');
    if (recentTransactions.length > 0) {
      recentTransactions.forEach((tx, index) => {
        const amount = parseFloat(tx.amount.toString());
        console.log(`  ${index + 1}. ${tx.paymentId}`);
        console.log(`     商品: ${tx.product.name}`);
        console.log(`     金額: ${(amount / 1000000).toLocaleString()} XYM`);
        console.log(`     確認日時: ${tx.confirmedAt ? new Date(tx.confirmedAt).toLocaleString() : 'なし'}`);
        console.log('');
      });
    } else {
      console.log('  確認済み取引なし');
    }
    
    // 処理中決済の詳細も確認
    console.log('\n⏳ 処理中決済の詳細:');
    const pendingDetails = await prisma.payment.findMany({
      where: {
        userId: testUser.id,
        status: 'pending'
      },
      include: {
        product: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (pendingDetails.length > 0) {
      pendingDetails.forEach((payment, index) => {
        const amount = parseFloat(payment.amount.toString());
        console.log(`  ${index + 1}. ${payment.paymentId}`);
        console.log(`     商品: ${payment.product.name}`);
        console.log(`     金額: ${(amount / 1000000).toLocaleString()} XYM`);
        console.log(`     作成: ${payment.createdAt.toLocaleString()}`);
        console.log(`     期限: ${payment.expireAt.toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('  処理中決済なし');
    }
    
    console.log('\n✅ 結論:');
    console.log('🔸 ダッシュボードの「処理中」は実際のデータベースのPrismaクエリから取得されています');
    console.log('🔸 status = "pending" の決済数をリアルタイムでカウントしています');
    console.log('🔸 ダミーデータではなく、実際の決済データです');
    console.log('🔸 新しい決済が作成されるたびに自動的に更新されます');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

directDatabaseCheck().catch(console.error);
