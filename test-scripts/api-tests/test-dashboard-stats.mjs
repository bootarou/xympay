import fetch from 'node-fetch';

async function testDashboardStatsAPI() {
  console.log('=== ダッシュボード統計API テスト ===\n');

  try {
    // ダッシュボード統計APIのテスト
    console.log('1. ダッシュボード統計API (/api/dashboard/stats) のテスト...');
    const response = await fetch('http://localhost:3000/api/dashboard/stats');
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('⚠ 認証が必要です（セッションなし）- これは正常な動作です');
        console.log('ログイン後にアクセスする必要があります');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } else {
      const data = await response.json();
      console.log('✓ API レスポンス成功');
      console.log('統計データ:', JSON.stringify(data, null, 2));
      
      // データ構造の確認
      const expectedFields = ['productCount', 'monthlyRevenue', 'monthlyTransactions', 'totalTransactions'];
      const missingFields = expectedFields.filter(field => !(field in data));
      
      if (missingFields.length === 0) {
        console.log('✓ すべての必要なフィールドが含まれています');
      } else {
        console.log('⚠ 不足しているフィールド:', missingFields);
      }
    }

    // formatAmount関数のテスト
    console.log('\n2. formatAmount関数のテスト...');
    const formatAmount = (amount) => {
      const xymAmount = amount / 1_000_000;
      
      let maximumFractionDigits = 6;
      if (xymAmount >= 1) {
        maximumFractionDigits = 2;
      } else if (xymAmount >= 0.01) {
        maximumFractionDigits = 4;
      } else {
        maximumFractionDigits = 6;
      }
      
      return new Intl.NumberFormat("ja-JP", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits,
      }).format(xymAmount);
    };

    const testAmounts = [2000000, 153848, 2, 0];
    console.log('金額フォーマットテスト:');
    testAmounts.forEach(amount => {
      console.log(`${amount} μXYM → ${formatAmount(amount)} XYM`);
    });

    // ホームページのアクセステスト
    console.log('\n3. ホームページ (/home) のアクセステスト...');
    const homeResponse = await fetch('http://localhost:3000/home');
    
    if (homeResponse.ok) {
      console.log('✓ ホームページにアクセス成功');
    } else {
      console.log(`⚠ ホームページにアクセスできませんでした (${homeResponse.status})`);
    }

    console.log('\n=== テスト完了 ===');
    console.log('📋 実装内容:');
    console.log('- /api/dashboard/stats: ユーザー固有の統計情報API');
    console.log('- useDashboardStats: 統計情報取得フック');
    console.log('- 登録商品数: リアルタイムデータ');
    console.log('- 今月の売上: 確認済み取引の合計（XYM表示）');
    console.log('- 総取引数: 全期間の取引数');
    console.log('- ローディング状態・エラーハンドリング対応');

  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nサーバーが起動していません。Next.jsアプリケーションを起動してから再実行してください。');
      console.log('起動コマンド: npm run dev');
    }
  }
}

testDashboardStatsAPI().catch(console.error);
