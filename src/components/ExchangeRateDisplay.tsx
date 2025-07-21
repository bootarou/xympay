import React, { useState, useEffect } from 'react'

interface ExchangeRateDisplayProps {
  amount: number | string
  fromCurrency?: string
  toCurrency?: string
  className?: string
}

interface ExchangeRateData {
  rate: number
  provider: string
  timestamp: string
  fromCurrency: string
  toCurrency: string
}

export function ExchangeRateDisplay({ 
  amount, 
  fromCurrency = 'XYM',
  toCurrency = 'JPY',
  className = ''
}: ExchangeRateDisplayProps) {
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // Hydration エラーを防ぐためのマウント状態管理
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let isMounted = true

    const fetchRate = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/exchange-rate?from=${fromCurrency}&to=${toCurrency}`)
        
        if (!response.ok) {
          throw new Error(`為替レート取得失敗: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '為替レートの取得に失敗しました')
        }

        if (isMounted) {
          setRateData(result.data)
        }
      } catch (err) {
        console.error('為替レート取得エラー:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : '為替レートの取得に失敗しました')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRate()

    // 30秒ごとに更新
    const interval = setInterval(fetchRate, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [mounted, fromCurrency, toCurrency])

  // マウント前は何も表示しない（Hydration エラー回避）
  if (!mounted) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`} suppressHydrationWarning>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const amountInXym = typeof amount === 'string' ? parseFloat(amount) : amount
  const amountInXymDisplay = (amountInXym / 1000000).toFixed(6).replace(/\.?0+$/, '')
  
  const fiatAmount = rateData ? (amountInXym / 1000000) * rateData.rate : 0

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-red-400">⚠️</span>
          <span className="text-red-600 text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`} suppressHydrationWarning>
      <div className="space-y-3">
        {/* メイン金額表示 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Number(amountInXymDisplay).toLocaleString()} XYM
            </div>
            <div className="text-sm text-gray-600">
              決済金額
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-600">
              ¥{fiatAmount.toLocaleString('ja-JP', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0 
              })}
            </div>
            <div className="text-sm text-gray-600">
              日本円換算
            </div>
          </div>
        </div>

        {/* レート情報 */}
        {rateData && (
          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                1 XYM = ¥{rateData.rate.toLocaleString('ja-JP', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4 
                })}
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
                <span>{rateData.provider}</span>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              最終更新: {mounted ? new Date(rateData.timestamp).toLocaleTimeString('ja-JP') : '--:--:--'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
