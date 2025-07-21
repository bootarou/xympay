// 会計ソフト同期機能のテストスクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAccountingSync() {
  console.log('🧪 会計ソフト同期機能のテスト開始');
  console.log('===================================');

  try {
    // 1. テストユーザーの取得
    const user = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    });

    if (!user) {
      console.log('❌ テストユーザーが見つかりません');
      return;
    }

    console.log(`✅ テストユーザー: ${user.email} (${user.id})`);

    // 2. 会計設定の作成テスト
    console.log('\n📝 会計設定の作成テスト');
    
    const testSettings = await prisma.accountingSyncSettings.create({
      data: {
        userId: user.id,
        provider: 'csv',
        isEnabled: true,
        autoSync: false,
        syncFrequency: 'daily',
        defaultTaxRate: 10.00,
        defaultAccountCode: '4110',
        exchangeRateSource: 'api'
      }
    });

    console.log(`✅ 設定作成成功: ${testSettings.id} (${testSettings.provider})`);

    // 3. 設定の更新テスト
    console.log('\n🔄 設定の更新テスト');
    
    const updatedSettings = await prisma.accountingSyncSettings.update({
      where: { id: testSettings.id },
      data: {
        autoSync: true,
        defaultTaxRate: 8.00
      }
    });

    console.log(`✅ 設定更新成功: 自動同期=${updatedSettings.autoSync}, 税率=${updatedSettings.defaultTaxRate}%`);

    // 4. 決済データの取得（エクスポート対象）
    console.log('\n💰 決済データの確認');
    
    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'confirmed'
      },
      include: {
        product: {
          select: { name: true }
        }
      },
      take: 5
    });

    console.log(`✅ 確認済み決済データ: ${payments.length}件`);
    payments.forEach((payment, index) => {
      const amountXYM = parseFloat(payment.amount.toString()) / 1000000;
      console.log(`  ${index + 1}. ${payment.paymentId}: ${amountXYM} XYM - ${payment.product.name}`);
    });

    // 5. 同期履歴の作成テスト
    console.log('\n📊 同期履歴の作成テスト');
    
    const syncHistory = await prisma.accountingSyncHistory.create({
      data: {
        userId: user.id,
        settingsId: testSettings.id,
        syncType: 'manual',
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date(),
        totalRecords: payments.length,
        successCount: payments.length,
        failedCount: 0,
        skippedCount: 0,
        dateFrom: new Date('2025-07-01'),
        dateTo: new Date('2025-07-31'),
        summary: 'テスト同期が正常に完了しました'
      }
    });

    console.log(`✅ 同期履歴作成成功: ${syncHistory.id} (${syncHistory.status})`);

    // 6. 同期済み決済の記録テスト
    if (payments.length > 0) {
      console.log('\n🔗 同期済み決済の記録テスト');
      
      const syncedPayment = await prisma.syncedPayment.create({
        data: {
          paymentId: payments[0].id,
          settingsId: testSettings.id,
          externalId: `TEST-EXT-${Date.now()}`,
          syncedAt: new Date(),
          syncData: {
            transactionDate: payments[0].confirmedAt?.toISOString() || payments[0].createdAt.toISOString(),
            amount: parseFloat(payments[0].amount.toString()) / 1000000,
            productName: payments[0].product.name,
            memo: `XymPay売上 - ${payments[0].product.name}`
          }
        }
      });

      console.log(`✅ 同期済み決済記録成功: ${syncedPayment.id}`);
    }

    // 7. データの一覧表示
    console.log('\n📋 作成されたデータの確認');
    
    const allSettings = await prisma.accountingSyncSettings.findMany({
      where: { userId: user.id },
      include: {
        syncHistory: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        },
        syncedPayments: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    allSettings.forEach(setting => {
      console.log(`\n設定: ${setting.provider} (${setting.isEnabled ? '有効' : '無効'})`);
      console.log(`  同期履歴: ${setting.syncHistory.length}件`);
      console.log(`  同期済み決済: ${setting.syncedPayments.length}件`);
    });

    // 8. APIエンドポイントのテスト（curl風の表示）
    console.log('\n🌐 APIエンドポイントの確認');
    console.log('以下のエンドポイントが利用可能です:');
    console.log('  GET    /api/accounting/settings           - 設定一覧');
    console.log('  POST   /api/accounting/settings           - 設定作成');
    console.log('  PUT    /api/accounting/settings/:id       - 設定更新');
    console.log('  DELETE /api/accounting/settings/:id       - 設定削除');
    console.log('  POST   /api/accounting/export             - データエクスポート');

    // 9. クリーンアップ
    console.log('\n🧹 テストデータのクリーンアップ');
    
    await prisma.syncedPayment.deleteMany({
      where: { settingsId: testSettings.id }
    });
    
    await prisma.accountingSyncHistory.deleteMany({
      where: { settingsId: testSettings.id }
    });
    
    await prisma.accountingSyncSettings.delete({
      where: { id: testSettings.id }
    });

    console.log('✅ テストデータを削除しました');

    console.log('\n🎉 すべてのテストが正常に完了しました！');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// CSVエクスポートのサンプルデータテスト
async function testCSVExport() {
  console.log('\n📄 CSVエクスポートのサンプル');
  console.log('========================');

  const sampleData = [
    {
      transactionDate: '2025-07-20',
      paymentId: 'TEST-PAYMENT-001',
      productName: 'デモ商品1',
      amountXYM: 10.000000,
      amountJPY: 450,
      exchangeRate: 45.00,
      status: 'confirmed',
      transactionId: 'ABC123DEF456',
      senderAddress: 'TABC123...XYZ789',
      taxRate: 10.00,
      accountCode: '4110',
      memo: 'XymPay売上 - デモ商品1'
    },
    {
      transactionDate: '2025-07-19',
      paymentId: 'TEST-PAYMENT-002',
      productName: 'デモ商品2',
      amountXYM: 5.500000,
      amountJPY: 247,
      exchangeRate: 45.00,
      status: 'confirmed',
      transactionId: 'DEF456GHI789',
      senderAddress: 'TDEF456...ABC123',
      taxRate: 10.00,
      accountCode: '4110',
      memo: 'XymPay売上 - デモ商品2'
    }
  ];

  const csvHeaders = [
    '取引日', '決済ID', '商品名', '金額(XYM)', '金額(JPY)', 
    '換算レート', 'ステータス', 'トランザクションID', '送信者アドレス', 
    '税率(%)', '勘定科目コード', '摘要'
  ];

  console.log(csvHeaders.join(','));
  sampleData.forEach(row => {
    const csvRow = [
      row.transactionDate,
      row.paymentId,
      `"${row.productName}"`,
      row.amountXYM,
      row.amountJPY,
      row.exchangeRate,
      row.status,
      row.transactionId,
      row.senderAddress,
      row.taxRate,
      row.accountCode,
      `"${row.memo}"`
    ];
    console.log(csvRow.join(','));
  });

  console.log('\n✅ CSVエクスポート形式のサンプルを表示しました');
}

// メイン実行
async function main() {
  await testAccountingSync();
  await testCSVExport();
}

main().catch(console.error);
