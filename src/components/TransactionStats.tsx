import { useState, useEffect } from 'react'

interface StatsPeriod {
  label: string
  value: string
  days?: number
}

interface StatsData {
  totalAmount: number
  transactionCount: number
  averageAmount: number
  baseCurrencyAmount?: number
  baseCurrency?: string
  growth?: {
    amount: number
    count: number
    percentage: number
  }
}

interface TransactionStatsProps {
  className?: string
  initialPeriod?: string
  onPeriodChange?: (period: string) => void
}

const STATS_PERIODS: StatsPeriod[] = [
  { label: '今日', value: 'today', days: 1 },
  { label: '今週', value: 'week', days: 7 },
  { label: '今月', value: 'month', days: 30 },
  { label: '3ヶ月', value: '3months', days: 90 },
  { label: '年間', value: 'year', days: 365 },
  { label: '全期間', value: 'all' }
]

export function TransactionStats({ className = '', initialPeriod = 'month', onPeriodChange }: TransactionStatsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriod)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 統計データを取得
  const fetchStats = async (period: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transactions/stats?period=${period}`)
      
      if (!response.ok) {
        throw new Error('統計データの取得に失敗しました')
      }

      const data = await response.json()
      setStatsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知のエラー')
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats(selectedPeriod)
  }, [selectedPeriod])

  // 外部からの期間変更を受け取る
  useEffect(() => {
    if (initialPeriod !== selectedPeriod) {
      setSelectedPeriod(initialPeriod)
    }
  }, [initialPeriod, selectedPeriod])

  // 期間変更ハンドラー
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    // 親コンポーネントに期間変更を通知
    if (onPeriodChange) {
      onPeriodChange(period)
    }
  }

  const formatAmount = (amount: number): string => {
    const xym = amount / 1000000
    return new Intl.NumberFormat('ja-JP', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: xym >= 1 ? 2 : 6,
    }).format(xym)
  }

  const formatBaseCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getCurrentPeriodLabel = (): string => {
    const period = STATS_PERIODS.find(p => p.value === selectedPeriod)
    return period?.label || '選択期間'
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">統計データエラー</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        {/* 期間選択ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            統計情報 - {getCurrentPeriodLabel()}
          </h3>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {STATS_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500">統計データを読み込み中...</span>
          </div>
        ) : statsData ? (
          <>
            {/* メイン統計 */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* 総売上 */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 overflow-hidden rounded-lg border border-green-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-green-700 truncate">総売上</dt>
                        <dd className="text-lg font-bold text-green-900 truncate" title={`${formatAmount(statsData.totalAmount)} XYM`}>
                          {formatAmount(statsData.totalAmount)} XYM
                        </dd>
                        {statsData.baseCurrencyAmount && statsData.baseCurrency && (
                          <dd className="text-sm text-green-600">
                            {formatBaseCurrency(statsData.baseCurrencyAmount, statsData.baseCurrency)}
                          </dd>
                        )}
                      </dl>
                    </div>
                  </div>
                  {statsData.growth && (
                    <div className="mt-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        statsData.growth.percentage >= 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {statsData.growth.percentage >= 0 ? '↗' : '↘'} {Math.abs(statsData.growth.percentage).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 取引数 */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 overflow-hidden rounded-lg border border-blue-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-blue-700 truncate">取引数</dt>
                        <dd className="text-lg font-bold text-blue-900">{statsData.transactionCount.toLocaleString()}件</dd>
                      </dl>
                    </div>
                  </div>
                  {statsData.growth && (
                    <div className="mt-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        statsData.growth.count >= 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {statsData.growth.count >= 0 ? '↗' : '↘'} {Math.abs(statsData.growth.count)}件
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 平均取引額 */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 overflow-hidden rounded-lg border border-purple-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-purple-700 truncate">平均取引額</dt>
                        <dd className="text-lg font-bold text-purple-900 truncate" title={`${formatAmount(statsData.averageAmount)} XYM`}>
                          {formatAmount(statsData.averageAmount)} XYM
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* 期間情報 */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 overflow-hidden rounded-lg border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-700 truncate">対象期間</dt>
                        <dd className="text-lg font-bold text-gray-900">{getCurrentPeriodLabel()}</dd>
                        <dd className="text-sm text-gray-600">
                          {selectedPeriod === 'all' ? '全データ' : `過去${STATS_PERIODS.find(p => p.value === selectedPeriod)?.days}日間`}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            統計データがありません
          </div>
        )}
      </div>
    </div>
  )
}
