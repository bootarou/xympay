import { ExchangeRateProvider, ExchangeRateResult } from '../types';

/**
 * CoinGecko API を使用した為替レートプロバイダー
 */
export class CoinGeckoProvider implements ExchangeRateProvider {
  readonly id = 'coingecko';
  readonly name = 'CoinGecko';
  readonly version = '1.0.0';
  readonly description = 'CoinGecko API を使用した為替レート取得';
  readonly supportedCurrencies = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'];
  readonly rateLimit = {
    requests: 50,
    window: 60 // 1分間に50リクエスト
  };

  private readonly apiUrl = 'https://api.coingecko.com/api/v3';
  private readonly coinId = 'symbol'; // XYMのCoinGecko ID

  async getRate(from: string, to: string): Promise<ExchangeRateResult> {
    if (from === 'XYM' && this.supportedCurrencies.includes(to)) {
      // XYM -> 法定通貨
      return this.getXYMToFiatRate(to);
    } else if (to === 'XYM' && this.supportedCurrencies.includes(from)) {
      // 法定通貨 -> XYM
      const xymRate = await this.getXYMToFiatRate(from);
      return {
        from,
        to,
        rate: 1 / xymRate.rate,
        timestamp: new Date(),
        provider: this.id,
        metadata: {
          source: 'coingecko',
          inverse: true,
          originalRate: xymRate.rate
        }
      };
    } else {
      throw new Error(`Unsupported currency pair: ${from} -> ${to}`);
    }
  }

  async getRates(from: string, to: string[]): Promise<ExchangeRateResult[]> {
    const results: ExchangeRateResult[] = [];
    
    for (const targetCurrency of to) {
      try {
        const result = await this.getRate(from, targetCurrency);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to get rate for ${from} -> ${targetCurrency}:`, error);
      }
    }
    
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getXYMToFiatRate(fiatCurrency: string): Promise<ExchangeRateResult> {
    const currency = fiatCurrency.toLowerCase();
    const url = `${this.apiUrl}/simple/price?ids=${this.coinId}&vs_currencies=${currency}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'XYMPay/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data[this.coinId] || !data[this.coinId][currency]) {
        throw new Error(`No rate found for XYM -> ${fiatCurrency}`);
      }
      
      const rate = data[this.coinId][currency];
      
      return {
        from: 'XYM',
        to: fiatCurrency,
        rate,
        timestamp: new Date(),
        provider: this.id,
        metadata: {
          source: 'coingecko',
          coinId: this.coinId,
          apiResponse: data
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to fetch rate from CoinGecko: ${error}`);
    }
  }
}

export const coinGeckoProvider = new CoinGeckoProvider();
