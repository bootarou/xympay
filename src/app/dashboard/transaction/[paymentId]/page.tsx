'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Layout } from '../../../../components'
import { ExchangeRateDisplay } from '../../../../components/ExchangeRateDisplay'

interface CustomField {
  id: string
  fieldName: string
  fieldType: string
  isRequired: boolean
  options: string[] | null
}

interface ProductImage {
  id: string
  url: string
  order: number
}

interface TransactionDetail {
  id: string
  paymentId: string
  amount: number
  status: string
  transactionId?: string
  senderAddress?: string
  confirmedAt: string
  createdAt: string
  formData: Record<string, string | number | boolean>
  // 為替レート情報を追加
  exchangeRate?: number
  baseCurrency?: string
  baseCurrencyAmount?: number
  rateProvider?: string
  rateTimestamp?: string
  product: {
    id: string
    uuid: string
    name: string
    price: number
    description: string | null
    images: ProductImage[]
    customFields: CustomField[]
  }
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.paymentId as string

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      try {
        const response = await fetch(`/api/dashboard/transaction/${paymentId}`)
        if (!response.ok) {
          throw new Error('取引詳細の取得に失敗しました')
        }
        
        const data = await response.json()
        setTransaction(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    if (paymentId) {
      fetchTransactionDetail()
    }
  }, [paymentId])

  const formatAmount = (amount: number): string => {
    return (amount / 1_000_000).toLocaleString('ja-JP', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    })
  }

  const renderCustomFieldValue = (field: CustomField, value: string | number | boolean) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">未入力</span>
    }

    switch (field.fieldType) {
      case 'select':
        return <span className="text-gray-900">{value}</span>
      case 'checkbox':
        return (
          <span className={`px-2 py-1 rounded text-xs ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'はい' : 'いいえ'}
          </span>
        )
      case 'textarea':
        return (
          <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-2 rounded border">
            {value}
          </div>
        )
      default:
        return <span className="text-gray-900">{value}</span>
    }
  }

  if (loading) {
    return (
      <Layout title="取引詳細">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">取引詳細を読み込み中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !transaction) {
    return (
      <Layout title="取引詳細">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-red-900 mb-2">エラーが発生しました</h2>
              <p className="text-red-700 mb-4">{error || '取引が見つかりません'}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="取引詳細">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">取引詳細</h1>
              <p className="text-gray-600">決済ID: {transaction.paymentId}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左カラム: 取引情報 */}
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">取引情報</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">決済ID:</span>
                  <span className="font-mono text-sm text-gray-900">{transaction.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    transaction.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transaction.status === 'confirmed' ? '完了' : transaction.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">金額:</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{formatAmount(transaction.amount)} XYM</span>
                    {transaction.baseCurrencyAmount && transaction.baseCurrency && (
                      <div className="text-sm text-gray-600">
                        ≈ {transaction.baseCurrencyAmount.toLocaleString('ja-JP', {
                          style: 'currency',
                          currency: transaction.baseCurrency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}
                        <span className="text-xs text-gray-500 ml-1">
                          (決済時価格)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">作成日時:</span>
                  <span className="text-gray-900">
                    {new Date(transaction.createdAt).toLocaleString('ja-JP')}
                  </span>
                </div>
                {transaction.confirmedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">確認日時:</span>
                    <span className="text-gray-900">
                      {new Date(transaction.confirmedAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 為替レート情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">為替レート情報</h3>
              
              {/* 決済時の為替レート表示 */}
              {transaction.exchangeRate && transaction.baseCurrency && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">決済時のレート</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">レート:</span>
                      <span className="font-medium">
                        1 XYM = ¥{transaction.exchangeRate.toLocaleString('ja-JP', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4
                        })}
                      </span>
                    </div>
                    {transaction.rateProvider && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">プロバイダ:</span>
                        <span className="text-gray-900">{transaction.rateProvider}</span>
                      </div>
                    )}
                    {transaction.rateTimestamp && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">レート取得時刻:</span>
                        <span className="text-gray-900">
                          {new Date(transaction.rateTimestamp).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 現在の為替レート表示 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">現在のレート</h4>
                <ExchangeRateDisplay
                  amount={transaction.amount}
                  fromCurrency="XYM"
                  toCurrency="JPY"
                />
              </div>
            </div>

            {/* トランザクション情報 */}
            {(transaction.transactionId || transaction.senderAddress) && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">ブロックチェーン情報</h3>
                <div className="space-y-4">
                  {transaction.transactionId && (
                    <div>
                      <span className="text-gray-600 block mb-2">トランザクションID:</span>
                      <code className="text-xs bg-white p-3 rounded border block break-all font-mono">
                        {transaction.transactionId}
                      </code>
                    </div>
                  )}
                  {transaction.senderAddress && transaction.status === 'confirmed' && (
                    <div>
                      <span className="text-gray-600 block mb-2">送信者アドレス:</span>
                      <code className="text-xs bg-white p-3 rounded border block break-all font-mono">
                        {transaction.senderAddress}
                      </code>
                      <p className="text-xs text-gray-500 mt-1">
                        このアドレスから支払いが行われました
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 為替レート情報 */}
            {transaction.exchangeRate && transaction.baseCurrency && (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">決済時為替レート情報</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">基準通貨:</span>
                    <span className="text-gray-900">{transaction.baseCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">為替レート:</span>
                    <span className="text-gray-900">
                      1 XYM = {transaction.exchangeRate.toLocaleString('ja-JP', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })} {transaction.baseCurrency}
                    </span>
                  </div>
                  {transaction.baseCurrencyAmount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">決済時価格:</span>
                      <span className="font-semibold text-gray-900">
                        {transaction.baseCurrencyAmount.toLocaleString('ja-JP', {
                          style: 'currency',
                          currency: transaction.baseCurrency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  )}
                  {transaction.rateProvider && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">レート提供元:</span>
                      <span className="text-gray-900 capitalize">{transaction.rateProvider}</span>
                    </div>
                  )}
                  {transaction.rateTimestamp && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">レート取得日時:</span>
                      <span className="text-gray-900">
                        {new Date(transaction.rateTimestamp).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">
                    ℹ️ この価格情報は税務処理や会計記録にご利用いただけます。レートは決済作成時点での値です。
                  </p>
                </div>
              </div>
            )}
            {transaction.formData && Object.keys(transaction.formData).length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">購入者情報</h2>
                
                <div className="space-y-4">
                  {transaction.product.customFields.map((field) => {
                    // フィールドIDまたはフィールド名でデータを検索
                    const value = transaction.formData[field.id] || transaction.formData[field.fieldName]
                    return (
                      <div key={field.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 mr-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.fieldName}
                              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="text-xs text-gray-500 mb-2">
                              {field.fieldType === 'text' && 'テキスト'}
                              {field.fieldType === 'email' && 'メールアドレス'}
                              {field.fieldType === 'tel' && '電話番号'}
                              {field.fieldType === 'textarea' && 'テキストエリア'}
                              {field.fieldType === 'select' && 'セレクト'}
                              {field.fieldType === 'checkbox' && 'チェックボックス'}
                              {field.fieldType === 'number' && '数値'}
                            </div>
                          </div>
                          <div className="flex-1">
                            {renderCustomFieldValue(field, value)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* フィールド定義にないデータも表示 */}
                  {Object.keys(transaction.formData).filter(key => 
                    !transaction.product.customFields.some(field => field.id === key || field.fieldName === key)
                  ).map((key) => (
                    <div key={key} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {key}
                          </label>
                          <div className="text-xs text-gray-500 mb-2">
                            その他のデータ
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-900">{String(transaction.formData[key])}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右カラム: 商品情報 */}
          <div className="space-y-6">
            {/* 商品詳細 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">商品情報</h2>
              
              {/* 商品画像 */}
              {transaction.product.images && transaction.product.images.length > 0 && (
                <div className="mb-4 relative h-48 w-full">
                  <Image
                    src={transaction.product.images[0].url}
                    alt={transaction.product.name}
                    fill
                    className="object-cover rounded-lg border"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{transaction.product.name}</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatAmount(transaction.product.price)} XYM
                  </p>
                </div>
                
                {transaction.product.description && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">商品説明</h4>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {transaction.product.description}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">商品ID: {transaction.product.uuid}</span>
                </div>
              </div>
            </div>

            {/* カスタムフィールド設定 */}
            {transaction.product.customFields && transaction.product.customFields.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">商品に設定されたフィールド</h3>
                <div className="space-y-3">
                  {transaction.product.customFields.map((field) => (
                    <div key={field.id} className="bg-white rounded p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{field.fieldName}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            field.isRequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {field.isRequired ? '必須' : '任意'}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {field.fieldType}
                          </span>
                        </div>
                      </div>
                      {field.options && field.options.length > 0 && (
                        <div className="text-xs text-gray-600">
                          選択肢: {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
