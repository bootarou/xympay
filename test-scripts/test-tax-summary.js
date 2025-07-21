/**
 * 税務サマリーAPIのテストスクリプト
 */

async function testTaxSummaryAPI() {
  try {
    console.log('🧾 税務サマリーAPIをテスト中...');

    const response = await fetch('http://localhost:3001/api/dashboard/tax-summary?year=2025', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('\n📊 税務サマリー結果:');
    console.log(`年度: ${data.year}`);
    console.log(`総取引数: ${data.summary.totalTransactions}`);
    console.log(`総売上 (XYM): ${data.summary.totalXYM} XYM`);
    console.log(`総売上 (基準通貨): ${data.summary.totalBaseCurrency} ${data.summary.baseCurrency}`);

    console.log('\n📅 月別統計:');
    data.monthlyStats.forEach(month => {
      if (month.transactionCount > 0) {
        console.log(`  ${month.monthName}: ${month.transactionCount}件, ${month.totalBaseCurrency} JPY`);
      }
    });

    console.log('\n🛍️ 商品別統計:');
    data.productStats.forEach(product => {
      console.log(`  ${product.productName}: ${product.transactionCount}件, ${product.totalBaseCurrency} JPY`);
    });

    console.log('\n✅ 税務サマリーAPIは正常に動作しています');

  } catch (error) {
    console.error('❌ 税務サマリーAPIエラー:', error.message);
  }
}

testTaxSummaryAPI();
