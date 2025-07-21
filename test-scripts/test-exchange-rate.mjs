import { exchangeRateManager } from './src/lib/exchange-rate/index.ts';

async function testExchangeRate() {
  console.log('=== 為替レート機能テスト ===\n');

  try {
    console.log('利用可能なプロバイダー:');
    const providers = exchangeRateManager.getAvailableProviders();
    providers.forEach(({ providerId, provider }) => {
      console.log(`- ${providerId}: ${provider.name} (${provider.description})`);
    });

    console.log('\nXYM → JPY レート取得テスト...');
    const rateResult = await exchangeRateManager.getRate('XYM', 'JPY');
    
    if (rateResult) {
      console.log('成功:', {
        rate: rateResult.rate,
        provider: rateResult.provider,
        timestamp: rateResult.timestamp,
        cached: rateResult.cached
      });
      
      // 実際の価格計算例
      const xymAmount = 2.5;
      const jpyAmount = xymAmount * rateResult.rate;
      console.log(`\n価格計算例:`);
      console.log(`${xymAmount} XYM = ${jpyAmount.toLocaleString('ja-JP')} JPY`);
    } else {
      console.log('レート取得失敗');
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

testExchangeRate().catch(console.error);
