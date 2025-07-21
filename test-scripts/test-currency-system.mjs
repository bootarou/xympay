// 通貨・為替レートシステムのテストスクリプト
import { exchangeRateManager } from '../src/lib/exchange-rate/index.js';

async function testCurrencySystem() {
  console.log('=== 通貨・為替レートシステム テスト ===\n');

  try {
    // 1. プロバイダー情報の確認
    console.log('1. 利用可能なプロバイダー:');
    const availableProviders = exchangeRateManager.getAvailableProviders();
    availableProviders.forEach(({ providerId, provider }) => {
      console.log(`  - ${provider.name} (${providerId})`);
      console.log(`    バージョン: ${provider.version}`);
      console.log(`    サポート通貨: ${provider.supportedCurrencies.join(', ')}`);
      console.log(`    レート制限: ${provider.rateLimit.requests}req/${provider.rateLimit.window}s`);
    });

    console.log('\n2. 設定情報:');
    const config = exchangeRateManager.getConfig();
    console.log('  設定:', JSON.stringify(config, null, 2));

    // 3. 健全性チェック
    console.log('\n3. プロバイダー健全性チェック:');
    const healthResults = await exchangeRateManager.healthCheck();
    Object.entries(healthResults).forEach(([providerId, isHealthy]) => {
      console.log(`  ${providerId}: ${isHealthy ? '✅ 正常' : '❌ 異常'}`);
    });

    // 4. レート取得テスト
    console.log('\n4. レート取得テスト:');
    
    const testPairs = [
      ['XYM', 'JPY'],
      ['XYM', 'USD'],
      ['JPY', 'XYM']
    ];

    for (const [from, to] of testPairs) {
      try {
        console.log(`\n  ${from} -> ${to}:`);
        const result = await exchangeRateManager.getRate(from, to);
        console.log(`    レート: ${result.rate}`);
        console.log(`    タイムスタンプ: ${result.timestamp.toISOString()}`);
        console.log(`    プロバイダー: ${result.provider}`);
        
        if (result.metadata) {
          console.log(`    メタデータ: ${JSON.stringify(result.metadata, null, 4)}`);
        }
      } catch (error) {
        console.log(`    ❌ エラー: ${error.message}`);
      }
    }

    // 5. キャッシュテスト
    console.log('\n5. キャッシュテスト:');
    console.log('  同じレートを再取得（キャッシュから）...');
    
    const start = Date.now();
    const cachedResult = await exchangeRateManager.getRate('XYM', 'JPY');
    const elapsed = Date.now() - start;
    
    console.log(`  取得時間: ${elapsed}ms`);
    console.log(`  レート: ${cachedResult.rate}`);
    console.log(`  タイムスタンプ: ${cachedResult.timestamp.toISOString()}`);

    // 6. 設定変更テスト
    console.log('\n6. 設定変更テスト:');
    exchangeRateManager.updateConfig({
      cacheDuration: 600 // 10分
    });
    
    const updatedConfig = exchangeRateManager.getConfig();
    console.log(`  キャッシュ時間変更: ${updatedConfig.cacheDuration}秒`);

    // 7. デバッグ情報
    console.log('\n7. デバッグ情報:');
    exchangeRateManager.debugInfo();

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

// テスト実行
testCurrencySystem().then(() => {
  console.log('\n✅ テスト完了');
}).catch(error => {
  console.error('❌ テスト失敗:', error);
});
