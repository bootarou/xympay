// 為替レートシステムのメインエクスポート
export * from './types';
export * from './manager';
export * from './providers';

import { exchangeRateManager } from './manager';
import { getProvidersForEnvironment, initializeExchangeRateProviders } from './providers';

// プロバイダーの自動登録
const providers = getProvidersForEnvironment();
exchangeRateManager.registerProviders(providers);

// プロバイダーの初期化
initializeExchangeRateProviders();

export { exchangeRateManager };
