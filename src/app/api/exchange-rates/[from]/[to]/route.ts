import { NextRequest, NextResponse } from 'next/server';
import { exchangeRateManager } from '../../../../../lib/exchange-rate';

export async function GET(
  request: NextRequest,
  { params }: { params: { from: string; to: string } }
) {
  try {
    const { from, to } = params;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing from or to currency parameters' },
        { status: 400 }
      );
    }

    const result = await exchangeRateManager.getRate(
      from.toUpperCase(),
      to.toUpperCase(),
      provider
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch exchange rate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
