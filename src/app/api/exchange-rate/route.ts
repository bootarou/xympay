import { NextRequest, NextResponse } from 'next/server'
import { exchangeRateManager } from '../../../lib/exchange-rate'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || 'XYM'
    const to = searchParams.get('to') || 'JPY'
    
    const result = await exchangeRateManager.getRate(from, to)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('為替レート取得エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '為替レートの取得に失敗しました'
    }, { status: 500 })
  }
}
