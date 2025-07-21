import { useState, useEffect } from "react"

interface Transaction {
  id: string
  paymentId: string
  status: string
  amount: number
  transactionId: string | null
  senderAddress: string | null
  message: string | null
  confirmedAt: Date | null
  createdAt: Date
  expireAt: Date | null
  userId: string | null
  product: {
    name: string
    price: number
  }
}

interface TransactionStats {
  totalAmount: number
  transactionCount: number
  averageAmount: number
  monthlyTransactions: number
  confirmedTransactionCount?: number
  totalTransactionCount?: number
}

interface TransactionFilters {
  period: string
  status: string
  limit: number
  offset: number
}

interface UseTransactionsReturn {
  transactions: Transaction[]
  stats: TransactionStats
  loading: boolean
  error: string | null
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  refetch: () => void
  fetchMore: () => void
}

export const useTransactions = (
  filters: TransactionFilters = {
    period: "all",
    status: "all",
    limit: 50,
    offset: 0,
  }
): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats>({
    totalAmount: 0,
    transactionCount: 0,
    averageAmount: 0,
    monthlyTransactions: 0,
    confirmedTransactionCount: 0,
    totalTransactionCount: 0,
  })
  const [pagination, setPagination] = useState({
    total: 0,
    limit: filters.limit,
    offset: filters.offset,
    hasMore: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async (isLoadMore = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', Math.floor((isLoadMore ? pagination.offset + pagination.limit : filters.offset) / filters.limit + 1).toString())
      params.append('limit', filters.limit.toString())
      
      // ステータスフィルター（"all"以外の場合のみ）
      if (filters.status !== "all") {
        params.append('status', filters.status)
      }
      
      // 期間フィルター（"all"以外の場合のみ）
      if (filters.period !== "all") {
        params.append('period', filters.period)
      }

      console.log('Fetching transactions with filters:', filters)
      console.log('Generated API params:', Object.fromEntries(params))
      const response = await fetch(`/api/transactions?${params}`)
      
      if (!response.ok) {
        throw new Error("取引履歴の取得に失敗しました")
      }

      const data = await response.json()
      console.log('API response:', { 
        transactionCount: data.transactions.length, 
        totalCount: data.pagination.totalCount 
      })

      if (isLoadMore) {
        setTransactions(prev => [...prev, ...data.transactions])
        setPagination(prev => ({
          total: data.pagination.totalCount,
          limit: data.pagination.limit,
          offset: prev.offset + prev.limit,
          hasMore: data.pagination.hasNext,
        }))
      } else {
        setTransactions(data.transactions)
        setPagination({
          total: data.pagination.totalCount,
          limit: data.pagination.limit,
          offset: filters.offset,
          hasMore: data.pagination.hasNext,
        })
      }

      // 統計情報をAPIレスポンスから設定
      if (data.stats) {
        setStats({
          totalAmount: data.stats.totalAmount,
          transactionCount: data.stats.confirmedTransactionCount, // 確認済み取引数
          averageAmount: data.stats.averageAmount,
          monthlyTransactions: data.stats.confirmedTransactionCount,
          confirmedTransactionCount: data.stats.confirmedTransactionCount,
          totalTransactionCount: data.stats.totalTransactionCount,
        })
      } else {
        // フォールバック: 現在のページのデータから計算
        const confirmedTransactions = data.transactions.filter((t: Transaction) => t.status === 'confirmed')
        const confirmedAmount = confirmedTransactions.reduce((sum: number, t: Transaction) => {
          return sum + (parseFloat(t.amount.toString()) || 0)
        }, 0)
        
        setStats({
          totalAmount: confirmedAmount,
          transactionCount: confirmedTransactions.length,
          averageAmount: confirmedTransactions.length > 0 ? confirmedAmount / confirmedTransactions.length : 0,
          monthlyTransactions: confirmedTransactions.length,
          confirmedTransactionCount: confirmedTransactions.length,
          totalTransactionCount: data.pagination.totalCount,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "取引履歴の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    fetchTransactions(false)
  }

  const fetchMore = () => {
    if (pagination.hasMore && !loading) {
      fetchTransactions(true)
    }
  }

  useEffect(() => {
    console.log('useTransactions effect triggered:', { 
      period: filters.period, 
      status: filters.status, 
      limit: filters.limit,
      offset: filters.offset 
    })
    fetchTransactions(false)
  }, [filters.period, filters.status, filters.limit, filters.offset]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    transactions,
    stats,
    loading,
    error,
    pagination,
    refetch,
    fetchMore,
  }
}

// ステータスの表示用テキスト
export const getStatusText = (status: string): string => {
  switch (status) {
    case "confirmed":
      return "完了"
    case "pending":
      return "処理中"
    case "expired":
      return "期限切れ"
    case "cancelled":
      return "キャンセル"
    default:
      return "不明"
  }
}

// ステータスの表示用CSS
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800"
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "expired":
      return "bg-red-100 text-red-800"
    case "cancelled":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

// 金額のフォーマット（すべてXYM単位で表示）
export const formatAmount = (amount: number | string): string => {
  // 数値に変換
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // NaNチェック
  if (isNaN(numAmount)) {
    return '0'
  }
  
  // すべてμXYM単位からXYMに変換
  const xymAmount = numAmount / 1_000_000
  
  // 金額に応じて小数点桁数を調整
  let maximumFractionDigits = 6
  if (xymAmount >= 1) {
    maximumFractionDigits = 2 // 1 XYM以上は小数点以下2桁
  } else if (xymAmount >= 0.01) {
    maximumFractionDigits = 4 // 0.01 XYM以上は小数点以下4桁
  } else {
    maximumFractionDigits = 6 // それ未満は小数点以下6桁
  }
  
  return new Intl.NumberFormat("ja-JP", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(xymAmount)
}

// μXYM用のフォーマット関数（デバッグ用）
export const formatAmountMicroXYM = (amount: number): string => {
  return new Intl.NumberFormat("ja-JP", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount)
}

// 日付のフォーマット
export const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}
