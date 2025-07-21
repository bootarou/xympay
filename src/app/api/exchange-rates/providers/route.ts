import { NextResponse } from 'next/server';
import { exchangeRateManager } from '../../../../lib/exchange-rate';

export async function GET() {
  try {
    const availableProviders = exchangeRateManager.getAvailableProviders();
    const enabledProviders = exchangeRateManager.getEnabledProviders();
    const config = exchangeRateManager.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        available: availableProviders.map(({ providerId, provider }) => ({
          id: providerId,
          name: provider.name,
          version: provider.version,
          description: provider.description,
          supportedCurrencies: provider.supportedCurrencies,
          rateLimit: provider.rateLimit
        })),
        enabled: enabledProviders.map(({ providerId }) => providerId),
        config
      }
    });

  } catch (error) {
    console.error('Error fetching exchange rate providers:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch providers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
