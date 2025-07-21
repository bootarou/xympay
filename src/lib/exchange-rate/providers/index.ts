// 為替レートプロバイダーのインデックスファイル
export { CoinGeckoProvider, coinGeckoProvider } from './coingecko';

// 他のプロバイダーもここにエクスポート
// export { CoinbaseProvider, coinbaseProvider } from './coinbase';
// export { BinanceProvider, binanceProvider } from './binance';

import { ExchangeRateProvider } from '../types';
import { coinGeckoProvider } from './coingecko';

/**
 * 利用可能な全プロバイダー
 */
export const allProviders: ExchangeRateProvider[] = [
  coinGeckoProvider
  // coinbaseProvider,
  // binanceProvider
];

/**
 * 本番環境用プロバイダー
 */
export const productionProviders: ExchangeRateProvider[] = [
  coinGeckoProvider
];

/**
 * 開発環境用プロバイダー（テスト用も含む）
 */
export const developmentProviders: ExchangeRateProvider[] = [
  coinGeckoProvider
];

/**
 * 環境に応じてプロバイダーを取得
 */
export function getProvidersForEnvironment(): ExchangeRateProvider[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('📊 Loading development exchange rate providers:', developmentProviders.length);
    return developmentProviders;
  } else {
    console.log('📊 Loading production exchange rate providers:', productionProviders.length);
    return productionProviders;
  }
}

/**
 * プロバイダーの初期化
 */
export function initializeExchangeRateProviders(): void {
  console.log('🚀 Initializing exchange rate providers...');
  
  allProviders.forEach(provider => {
    console.log(`✅ Loaded provider: ${provider.name} (${provider.id}) v${provider.version}`);
  });
  
  console.log(`📊 Total exchange rate providers loaded: ${allProviders.length}`);
}
