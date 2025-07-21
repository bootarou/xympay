'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PaymentHistoryItem {
  id: string
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled'
  amount: number
  recipientAddress: string
  transactionId?: string
  product: {
    id: string
    name: string
    price: number
  }
  createdAt: string
  confirmedAt?: string
  expireAt: string
}

interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function PaymentHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [pagination, setPagination] = useState<PaymentHistoryResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // 認証チェック
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
  }, [status, router])

  // 決済履歴を取得
  const fetchPaymentHistory = async (page: number = 1, statusFilter: string = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/payment/history?${params}`)
      if (!response.ok) {
        throw new Error('決済履歴の取得に失敗しました')
      }

      const data: PaymentHistoryResponse = await response.json()
      setPayments(data.payments)
      setPagination(data.pagination)
      setCurrentPage(page)

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchPaymentHistory(currentPage, statusFilter)
    }
  }, [session, currentPage, statusFilter])

  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'confirmed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'expired':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '決済待ち'
      case 'confirmed':
        return '決済完了'
      case 'expired':
        return '期限切れ'
      case 'cancelled':
        return 'キャンセル'
      default:
        return '不明'
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">決済履歴</h1>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                ステータス:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="pending">決済待ち</option>
                <option value="confirmed">決済完了</option>
                <option value="expired">期限切れ</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>
        </div>

        {/* 決済履歴リスト */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">決済履歴を読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <p className="text-gray-600">決済履歴がありません</p>
            </div>
          ) : (
            <>
              {/* デスクトップ表示（テーブル形式） */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        決済日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {payment.id.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.amount} XYM
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(payment.status)}>
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.createdAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {payment.status === 'confirmed' ? (
                              <Link
                                href={`/payment/${payment.id}/complete`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                詳細
                              </Link>
                            ) : payment.status === 'pending' ? (
                              <Link
                                href={`/payment/${payment.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                決済画面
                              </Link>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* モバイル表示（カード形式） */}
              <div className="md:hidden space-y-4 p-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{payment.product.name}</h3>
                        <p className="text-sm text-gray-500">ID: {payment.id.slice(0, 8)}...</p>
                      </div>
                      <span className={getStatusBadge(payment.status)}>
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div>金額: {payment.amount} XYM</div>
                      <div>決済日時: {new Date(payment.createdAt).toLocaleString('ja-JP')}</div>
                    </div>
                    
                    <div className="flex justify-end">
                      {payment.status === 'confirmed' ? (
                        <Link
                          href={`/payment/${payment.id}/complete`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          詳細を見る
                        </Link>
                      ) : payment.status === 'pending' ? (
                        <Link
                          href={`/payment/${payment.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          決済画面へ
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* ページネーション */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => fetchPaymentHistory(currentPage - 1, statusFilter)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => fetchPaymentHistory(currentPage + 1, statusFilter)}
                        disabled={!pagination.hasNext}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        次へ
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{((currentPage - 1) * 10) + 1}</span>
                          {' '}から{' '}
                          <span className="font-medium">{Math.min(currentPage * 10, pagination.totalCount)}</span>
                          {' '}まで （全{' '}
                          <span className="font-medium">{pagination.totalCount}</span>
                          {' '}件）
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => fetchPaymentHistory(currentPage - 1, statusFilter)}
                            disabled={!pagination.hasPrev}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            ←
                          </button>
                          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => fetchPaymentHistory(page, statusFilter)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => fetchPaymentHistory(currentPage + 1, statusFilter)}
                            disabled={!pagination.hasNext}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            →
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
