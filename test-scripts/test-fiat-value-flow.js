/**
 * フィアット価値保存機能のテストスクリプト
 * 
 * このスクリプトは以下をテストします：
 * 1. 新しい支払いの作成
 * 2. フィアット価値の自動計算と保存
 * 3. ダッシュボード統計の表示
 */

const API_BASE = 'http://localhost:3001/api';

async function testFiatValueFlow() {
  console.log('🧪 フィアット価値保存機能のテスト開始');

  try {
    // 1. 既存の商品を取得
    console.log('\n📦 商品一覧を取得中...');
    const productsResponse = await fetch(`${API_BASE}/products`, {
      credentials: 'include'
    });
    
    if (!productsResponse.ok) {
      throw new Error('商品取得に失敗しました');
    }
    
    const products = await productsResponse.json();
    console.log(`✅ ${products.length}個の商品を取得しました`);
    
    if (products.length === 0) {
      console.log('❌ テスト用の商品が見つかりません。先に商品を作成してください。');
      return;
    }

    const testProduct = products[0];
    console.log(`🎯 テスト対象商品: ${testProduct.name} (${testProduct.price} microXYM)`);

    // 2. 新しい支払いを作成
    console.log('\n💳 新しい支払いを作成中...');
    const paymentResponse = await fetch(`${API_BASE}/payment/${testProduct.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        customFields: {
          customerEmail: 'test@example.com',
          customerName: 'テストユーザー'
        }
      })
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`支払い作成に失敗しました: ${errorText}`);
    }

    const payment = await paymentResponse.json();
    console.log(`✅ 支払いを作成しました: ${payment.paymentId}`);
    console.log(`💰 XYM金額: ${payment.amount / 1000000} XYM`);
    
    if (payment.baseCurrencyAmount) {
      console.log(`💴 フィアット価値: ${payment.baseCurrencyAmount} ${payment.baseCurrency}`);
      console.log(`📊 レート: 1 XYM = ${payment.exchangeRate} ${payment.baseCurrency}`);
      console.log(`📅 レート取得時刻: ${payment.rateTimestamp}`);
      console.log(`🏦 レートプロバイダー: ${payment.rateProvider}`);
    } else {
      console.log('⚠️ フィアット価値が設定されていません');
    }

    // 3. 支払い詳細を確認
    console.log('\n🔍 支払い詳細を確認中...');
    const detailResponse = await fetch(`${API_BASE}/dashboard/transaction/${payment.paymentId}`, {
      credentials: 'include'
    });

    if (detailResponse.ok) {
      const detail = await detailResponse.json();
      console.log('✅ 支払い詳細を取得しました:');
      console.log(`  - 状態: ${detail.status}`);
      console.log(`  - XYM金額: ${detail.amount / 1000000} XYM`);
      if (detail.baseCurrencyAmount) {
        console.log(`  - フィアット価値: ${detail.baseCurrencyAmount} ${detail.baseCurrency}`);
      }
    }

    // 4. ダッシュボード統計を確認
    console.log('\n📊 ダッシュボード統計を確認中...');
    const statsResponse = await fetch(`${API_BASE}/dashboard/details`, {
      credentials: 'include'
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ ダッシュボード統計を取得しました:');
      console.log(`  - 総売上 (XYM): ${stats.totalSales / 1000000} XYM`);
      console.log(`  - 総売上 (フィアット): ${stats.totalBaseCurrencySales} 円`);
      console.log(`  - 総取引数: ${stats.totalTransactions}`);
      console.log(`  - 保留中: ${stats.pendingPayments}`);
    }

    console.log('\n🎉 テスト完了！ブラウザでダッシュボードを確認してください。');
    console.log(`🔗 http://localhost:3001/dashboard/transaction/${payment.paymentId}`);

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  }
}

// メイン実行
testFiatValueFlow();
