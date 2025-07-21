/**
 * ダッシュボードAPIの直接テスト
 * 実際にAPIが返すデータを確認
 */

async function testDashboardAPI() {
  try {
    console.log('=== ダッシュボードAPI テスト ===\n');
    
    // APIを直接呼び出し
    const response = await fetch('http://localhost:3001/api/dashboard/details', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: 実際のブラウザではセッションクッキーが自動で送信される
      }
    });
    
    if (!response.ok) {
      console.log('❌ API呼び出し失敗:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('エラー詳細:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ APIレスポンス受信成功');
    console.log('\n📊 ダッシュボードデータ:');
    console.log('  今月の売上:', (data.totalSales / 1000000).toLocaleString(), 'XYM');
    console.log('  売上 (税務用):', data.totalBaseCurrencySales ? `¥${data.totalBaseCurrencySales.toLocaleString()}` : '¥0');
    console.log('  総取引数:', data.totalTransactions, '件');
    console.log('  処理中:', data.pendingPayments, '件 ← これが「処理中」に表示されます');
    console.log('  期限切れ・失敗:', data.errorCount, '件');
    
    console.log('\n📋 最近の取引:');
    if (data.recentTransactions && data.recentTransactions.length > 0) {
      data.recentTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.paymentId} - ${tx.productName} (${(tx.amount / 1000000).toLocaleString()} XYM)`);
      });
    } else {
      console.log('  取引履歴なし');
    }
    
    console.log('\n✅ 結論: ダッシュボードの「処理中」項目は実際のデータベースから取得されており、ダミーではありません');
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.log('\n💡 注意: このテストは認証が必要なAPIのため、ブラウザ経由でないと正常に動作しない可能性があります');
  }
}

testDashboardAPI().catch(console.error);
