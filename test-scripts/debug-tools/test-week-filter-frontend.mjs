// 今週フィルターのフロントエンド検証スクリプト
import fetch from 'node-fetch';

async function testWeekFilterFrontend() {
  console.log('=== 今週フィルターのフロントエンド検証 ===');
  
  const baseUrl = 'http://localhost:3000';
  
  // 今週フィルターでAPIを直接呼び出し
  try {
    const response = await fetch(`${baseUrl}/api/transactions?period=week&limit=50&page=1`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('API レスポンス:');
    console.log(`- 取得件数: ${data.transactions.length}`);
    console.log(`- 総件数: ${data.pagination.totalCount}`);
    console.log('- 取引データ（上位5件）:');
    
    data.transactions.slice(0, 5).forEach((transaction, index) => {
      const createdAt = new Date(transaction.createdAt);
      console.log(`  ${index + 1}. ${transaction.paymentId}: ${createdAt.toISOString()} (${transaction.status})`);
    });
    
    // 統計情報も確認
    console.log('\n- 統計情報:');
    console.log(`  総額: ${data.stats.totalAmount}`);
    console.log(`  取引数: ${data.stats.transactionCount}`);
    console.log(`  平均額: ${data.stats.averageAmount}`);
    
    // 日付の範囲をチェック
    if (data.transactions.length > 0) {
      const dates = data.transactions.map(t => new Date(t.createdAt));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      console.log('\n- 日付範囲:');
      console.log(`  最古: ${minDate.toISOString()}`);
      console.log(`  最新: ${maxDate.toISOString()}`);
      
      // 現在時刻より未来のデータがあるかチェック
      const now = new Date();
      const futureData = data.transactions.filter(t => new Date(t.createdAt) > now);
      
      if (futureData.length > 0) {
        console.log(`\n⚠️  未来のデータが ${futureData.length} 件見つかりました:`);
        futureData.forEach(t => {
          console.log(`  ${t.paymentId}: ${new Date(t.createdAt).toISOString()}`);
        });
      } else {
        console.log('\n✅ 未来のデータは見つかりませんでした');
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// 他の期間フィルターもテスト
async function testAllPeriodFilters() {
  console.log('\n\n=== 全期間フィルターのテスト ===');
  
  const periods = ['all', 'today', 'week', 'month', '3months'];
  const baseUrl = 'http://localhost:3000';
  
  for (const period of periods) {
    try {
      const response = await fetch(`${baseUrl}/api/transactions?period=${period}&limit=10&page=1`);
      const data = await response.json();
      
      console.log(`\n${period.toUpperCase()}:`)
      console.log(`  件数: ${data.transactions.length} / ${data.pagination.totalCount}`)
      
      if (data.transactions.length > 0) {
        const firstDate = new Date(data.transactions[0].createdAt);
        const lastDate = new Date(data.transactions[data.transactions.length - 1].createdAt);
        console.log(`  最新: ${firstDate.toISOString()}`);
        console.log(`  最古: ${lastDate.toISOString()}`);
      }
      
    } catch (error) {
      console.error(`${period} エラー:`, error.message);
    }
  }
}

testWeekFilterFrontend()
  .then(() => testAllPeriodFilters())
  .catch(console.error);
