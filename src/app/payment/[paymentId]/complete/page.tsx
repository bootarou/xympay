'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface PaymentInfo {
  paymentId: string
  status: string
  amount: number
  product: {
    id: string
    name: string
    price: number
  }
  transactionId?: string
  confirmedAt?: string
  exchangeRate?: number | null
  baseCurrency?: string | null
  baseCurrencyAmount?: number | null
  rateProvider?: string | null
  rateTimestamp?: string | null
}

export default function PaymentCompletePage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.paymentId as string

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // ページを閉じる処理
  const handleClose = () => {
    // まず window.close() を試行
    window.close()
    
    // window.close() が失敗した場合（新しいタブでない場合など）
    setTimeout(() => {
      // ブラウザの戻る機能を使用
      if (window.history.length > 1) {
        window.history.back()
      } else {
        // 履歴がない場合はホームページにリダイレクト
        router.push('/')
      }
    }, 100)
  }

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const response = await fetch(`/api/payment/status/${paymentId}`)
        if (!response.ok) {
          throw new Error('決済情報の取得に失敗しました')
        }
        
        const data = await response.json()
        
        // 決済が完了していない場合は決済画面にリダイレクト
        if (data.status !== 'confirmed') {
          router.push(`/payment/${paymentId}`)
          return
        }
        
        setPaymentInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    if (paymentId) {
      fetchPaymentInfo()
    }
  }, [paymentId, router])

  // Escキーで閉じる機能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // handleClose関数の内容をここに直接記述
        window.close()
        setTimeout(() => {
          if (window.history.length > 1) {
            window.history.back()
          } else {
            router.push('/')
          }
        }, 100)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">決済情報を確認中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">決済情報が見つかりません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 成功ヘッダー */}
          <div className="bg-green-600 text-white p-6 text-center relative">
            {/* 閉じるボタン */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white hover:text-green-200 transition-colors"
              title="ページを閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-2">決済完了！</h1>
            <p className="text-green-100">お支払いありがとうございました</p>
          </div>

          {/* 決済詳細 */}
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                決済が正常に完了しました
              </h2>
              <p className="text-gray-600">
                ご購入いただいた商品の情報は以下の通りです
              </p>
            </div>

            {/* 商品情報 */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">商品情報</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">商品名:</span>
                  <span className="font-medium text-gray-900">{paymentInfo.product.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">金額:</span>
                  <span className="font-medium text-gray-900">
                    {Number((Number(paymentInfo.amount) / 1000000).toFixed(6)).toString()} XYM
                  </span>
                </div>
                {/* 為替レート情報がある場合は基軸通貨での金額も表示 */}
                {paymentInfo.exchangeRate && paymentInfo.baseCurrencyAmount && paymentInfo.baseCurrency && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">金額 ({paymentInfo.baseCurrency}):</span>
                    <span className="font-medium text-blue-600">
                      {paymentInfo.baseCurrency === 'JPY' ? '¥' : ''}{paymentInfo.baseCurrencyAmount.toLocaleString('ja-JP', {
                        minimumFractionDigits: paymentInfo.baseCurrency === 'JPY' ? 0 : 2,
                        maximumFractionDigits: paymentInfo.baseCurrency === 'JPY' ? 0 : 4
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">決済ID:</span>
                  <span className="font-mono text-sm text-gray-700">
                    {paymentInfo.paymentId}
                  </span>
                </div>
              </div>
            </div>

            {/* 為替レート情報 */}
            {paymentInfo.exchangeRate && paymentInfo.baseCurrency && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">為替レート情報</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">決済時レート:</span>
                    <span className="font-medium text-gray-900">
                      1 XYM = {paymentInfo.baseCurrency === 'JPY' ? '¥' : ''}{paymentInfo.exchangeRate.toLocaleString('ja-JP', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4
                      })} {paymentInfo.baseCurrency}
                    </span>
                  </div>
                  {paymentInfo.rateProvider && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">レート提供者:</span>
                      <span className="text-sm text-gray-700">{paymentInfo.rateProvider}</span>
                    </div>
                  )}
                  {paymentInfo.rateTimestamp && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">レート取得時刻:</span>
                      <span className="text-sm text-gray-700">
                        {new Date(paymentInfo.rateTimestamp).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* トランザクション情報 */}
            {paymentInfo.transactionId && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">トランザクション情報</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 block mb-1">トランザクションID:</span>
                    <code className="text-sm bg-white p-2 rounded border block break-all">
                      {paymentInfo.transactionId}
                    </code>
                  </div>
                  {paymentInfo.confirmedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">確認日時:</span>
                      <span className="text-sm text-gray-700">
                        {new Date(paymentInfo.confirmedAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 次のアクション */}
            <div className="text-center space-y-4">
              <p className="text-gray-600 mb-6">
                領収書が必要な場合は、上記のトランザクションIDをお控えください。
              </p>
              
              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  ページを閉じる
                </button>
              </div>
            </div>

            {/* フッター情報 */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-2">
                このページは印刷またはスクリーンショットを保存することをお勧めします。
              </p>
              <p className="text-xs text-gray-400">
                Escキーまたは右上の×ボタンでページを閉じることができます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
