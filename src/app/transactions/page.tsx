"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Layout } from "../../components"
import { TransactionStats } from "../../components/TransactionStats"
import { useTranslation } from "../../lib/i18n"
import { useTransactions, getStatusText, getStatusColor, formatAmount, formatDate } from "../../hooks/useTransactions"
import SyncProgressMonitor from "../../components/SyncProgressMonitor"

// SalesChartを動的インポート（Chart.jsの問題を回避）
const SalesChart = dynamic(
  () => import("../../components/SalesChart"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">売上推移</h3>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    ),
  }
)

export default function Transactions() {
  const { status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const [filters, setFilters] = useState({
    period: "month", // デフォルトを"month"に変更（統計の初期値と合わせる）
    status: "all",
    limit: 50,
    offset: 0,
  })
  const [statsSelectedPeriod, setStatsSelectedPeriod] = useState("month") // 統計期間の状態を追加
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]) // 選択された取引
  const [syncLoading, setSyncLoading] = useState(false) // 同期処理中
  const [currentSyncHistoryId, setCurrentSyncHistoryId] = useState<string | null>(null) // 進行中の同期ID
  const [accountingSettings, setAccountingSettings] = useState<any[]>([]) // 会計設定一覧

  const { transactions, loading, error, pagination, refetch, fetchMore } = useTransactions(filters)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // 会計設定の取得
  useEffect(() => {
    const fetchAccountingSettings = async () => {
      try {
        const response = await fetch('/api/accounting/settings');
        if (response.ok) {
          const data = await response.json();
          setAccountingSettings(data.settings.filter((s: any) => s.isEnabled && s.authTokens));
        }
      } catch (error) {
        console.error('Failed to fetch accounting settings:', error);
      }
    };

    if (status === 'authenticated') {
      fetchAccountingSettings();
    }
  }, [status]);

  // デバッグ: 初期化時の状態確認
  useEffect(() => {
    console.log('Transactions page initialized:', {
      statsSelectedPeriod,
      filters,
      sessionStatus: status
    })
  }, [statsSelectedPeriod, filters, status])

  const handleFilterChange = (key: string, value: string) => {
    console.log(`Filter changed: ${key} = ${value}`)
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value,
        offset: 0, // フィルタ変更時はオフセットをリセット
      }
      console.log('New filters:', newFilters)
      
      // 期間フィルターが変更された場合、統計期間も同期
      if (key === 'period') {
        const statsMapping = {
          'today': 'today',
          'week': 'week', 
          'month': 'month',
          '3months': '3months',
          'all': 'all'
        }
        const newStatsPeriod = statsMapping[value] || 'month'
        setStatsSelectedPeriod(newStatsPeriod)
      }
      
      return newFilters
    })
  }

  const handleExportCSV = async () => {
    try {
      setExportLoading(true)
      
      const params = new URLSearchParams({
        status: filters.status === "all" ? "" : filters.status,
        period: filters.period === "all" ? "" : filters.period,
      })

      const response = await fetch(`/api/transactions/export?${params}`)
      
      if (!response.ok) {
        throw new Error("CSVエクスポートに失敗しました")
      }

      // ファイルダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // ファイル名を設定（レスポンスヘッダーから取得または日付付きデフォルト）
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'transactions.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('CSV export completed successfully')
    } catch (error) {
      console.error('CSV export error:', error)
      alert('CSVエクスポートに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setExportLoading(false)
    }
  }

  // 統計期間から取引履歴期間へのマッピング
  const mapStatsPeriodToFilterPeriod = (statsPeriod: string): string => {
    switch (statsPeriod) {
      case 'today':
        return 'today'
      case 'week':
        return 'week'
      case 'month':
        return 'month'
      case '3months':
        return '3months'
      case 'year':
        return 'month' // 年間は月単位表示
      case 'all':
        return 'all'
      default:
        return 'month'
    }
  }

  // 統計期間変更ハンドラー
  const handleStatsPeriodChange = (statsPeriod: string) => {
    const filterPeriod = mapStatsPeriodToFilterPeriod(statsPeriod)
    setStatsSelectedPeriod(statsPeriod)
    
    // 取引履歴フィルターも同期
    setFilters(prev => ({
      ...prev,
      period: filterPeriod,
      offset: 0, // オフセットをリセット
    }))
  }

  // 会計ソフト同期処理
  const handleSyncToAccounting = async (settingsId: string) => {
    if (selectedTransactions.length === 0) {
      alert('同期する取引を選択してください');
      return;
    }

    try {
      setSyncLoading(true);
      
      const response = await fetch('/api/accounting/freee/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIds: selectedTransactions,
          settingsId: settingsId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentSyncHistoryId(data.syncHistoryId);
        alert(`同期処理を開始しました。${data.successCount}件の取引を処理中です。`);
      } else {
        throw new Error(data.error || '同期処理の開始に失敗しました');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '同期エラーが発生しました');
    } finally {
      setSyncLoading(false);
    }
  };

  // 同期完了時のコールバック
  const handleSyncComplete = (result: any) => {
    setCurrentSyncHistoryId(null);
    setSelectedTransactions([]); // 選択をクリア
    refetch(); // 取引一覧を再取得
    alert(`同期が完了しました。成功: ${result.successCount}件, エラー: ${result.errorCount}件`);
  };

  // 取引選択のハンドラー
  const handleTransactionSelect = (transactionId: string, checked: boolean) => {
    setSelectedTransactions(prev => 
      checked 
        ? [...prev, transactionId]
        : prev.filter(id => id !== transactionId)
    );
  };

  // 全選択/全解除
  const handleSelectAll = (checked: boolean) => {
    setSelectedTransactions(
      checked 
        ? transactions.filter(t => t.status === 'confirmed').map(t => t.id)
        : []
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t("common.loading")}</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }
  return (
    <Layout title={t("transactions.title")}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 取引履歴ヘッダー */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {t("transactions.title")}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                過去の取引履歴と決済状況を確認できます
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleExportCSV}
                disabled={exportLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <svg className="-ml-1 mr-2 h-5 w-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSVダウンロード
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* 統計情報 */}
        <TransactionStats 
          className="mb-8" 
          initialPeriod={statsSelectedPeriod}
          onPeriodChange={handleStatsPeriodChange} 
        />

        {/* 売上推移グラフ */}
        <SalesChart className="mb-8" />

        {/* フィルター */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  期間
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    統計と連動
                  </span>
                </label>
                <select 
                  value={filters.period}
                  onChange={(e) => handleFilterChange("period", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">すべて</option>
                  <option value="today">今日</option>
                  <option value="week">今週</option>
                  <option value="month">今月</option>
                  <option value="3months">過去3ヶ月</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ステータス</label>
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">すべて</option>
                  <option value="confirmed">完了</option>
                  <option value="pending">処理中</option>
                  <option value="expired">期限切れ</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">表示件数</label>
                <select 
                  value={filters.limit}
                  onChange={(e) => handleFilterChange("limit", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="10">10件</option>
                  <option value="25">25件</option>
                  <option value="50">50件</option>
                  <option value="100">100件</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 取引履歴テーブル */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-lg text-gray-500">読み込み中...</div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-lg text-red-500">エラー: {error}</div>
                <button 
                  onClick={refetch}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  再読み込み
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">取引履歴がありません</h3>
                <p className="mt-1 text-sm text-gray-500">商品の販売が開始されると、ここに取引履歴が表示されます。</p>
                <div className="mt-6">
                  <a
                    href="/products/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    商品を登録する
                  </a>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        取引ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        送信者
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatAmount(transaction.amount)} XYM
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                            {getStatusText(transaction.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.transactionId ? (
                            <a
                              href={`https://symbol.fyi/transactions/${transaction.transactionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {transaction.transactionId.slice(0, 8)}...
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.senderAddress ? (
                            <span className="font-mono">
                              {transaction.senderAddress.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ページネーション */}
                {pagination.hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={fetchMore}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? "読み込み中..." : "さらに読み込む"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 会計ソフト同期モニター */}
        {currentSyncHistoryId && (
          <SyncProgressMonitor 
            syncHistoryId={currentSyncHistoryId} 
            onComplete={handleSyncComplete}
          />
        )}

        {/* 会計ソフト同期設定 */}
        {status === 'authenticated' && accountingSettings.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">会計ソフト同期</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">同期設定</label>
                  <select 
                    onChange={(e) => handleSyncToAccounting(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {accountingSettings.map((setting) => (
                      <option key={setting.id} value={setting.id}>
                        {setting.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleSyncToAccounting(selectedTransactions[0])}
                    disabled={syncLoading || selectedTransactions.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncLoading ? (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        同期中...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        同期開始
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
