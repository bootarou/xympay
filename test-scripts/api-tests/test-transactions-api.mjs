import fetch from 'node-fetch';

async function testTransactionsAPI() {
  console.log('=== 取引履歴API レスポンステスト ===\n');

  try {
    // 取引履歴APIを呼び出し
    const response = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&period=all&status=all');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('API レスポンス構造:');
    console.log('- transactions配列の長さ:', data.transactions?.length || 0);
    console.log('- pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('- stats:', JSON.stringify(data.stats, null, 2));

    // formatAmount関数をシミュレート
    const formatAmount = (amount) => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount)) return '0';
      const xymAmount = numAmount / 1_000_000;
      return new Intl.NumberFormat("ja-JP", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }).format(xymAmount);
    };

    if (data.stats) {
      console.log('\nフロントエンドでの統計表示:');
      console.log('- 総売上:', formatAmount(data.stats.totalAmount), 'XYM');
      console.log('- 平均取引額:', formatAmount(data.stats.averageAmount), 'XYM');
      console.log('- 取引数:', data.stats.confirmedTransactionCount);
    }

    if (data.transactions && data.transactions.length > 0) {
      console.log('\n取引一覧 (最初の3件):');
      data.transactions.slice(0, 3).forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.product.name}: ${formatAmount(tx.amount)} XYM (${tx.status})`);
      });
    }

  } catch (error) {
    console.error('APIテスト中にエラーが発生しました:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nサーバーが起動していません。Next.jsアプリケーションを起動してから再実行してください。');
      console.log('起動コマンド: npm run dev');
    }
  }
}

testTransactionsAPI().catch(console.error);
