'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Product {
  id: string
  uuid: string
  name: string
  price: number
  description: string | null
  images: Array<{
    id: string
    url: string
    order: number
  }>
}

export default function ProductViewPage() {
  const params = useParams()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) {
          throw new Error('商品が見つかりません')
        }
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '商品の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])
  const handleStartPayment = async () => {
    if (!product) return

    try {
      // 決済を開始
      const response = await fetch(`/api/payment/${product.uuid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: {}
        })
      })

      if (!response.ok) {
        throw new Error('決済の準備に失敗しました')
      }

      const data = await response.json()
      
      // セッションストレージに決済IDを保存（セキュリティ向上）
      const sessionKey = `payment_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(sessionKey, JSON.stringify({
        paymentId: data.paymentId,
        productId: product.id,
        timestamp: Date.now()
      }))
      
      // セッションキーベースの安全なURLで決済ページを開く
      const paymentUrl = `/payment/session/${sessionKey}`
      
      // 新しいタブで決済ページを開く（共有リスクを軽減）
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=900,scrollbars=yes')
      
      if (!paymentWindow) {
        // ポップアップがブロックされた場合は同じタブで開く
        window.location.href = paymentUrl
      }
      
    } catch (error) {
      console.error('決済開始エラー:', error)
      alert('決済の開始に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">商品情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">商品が見つかりません</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 商品画像 */}
          {product.images.length > 0 && (
            <div className="aspect-video bg-gray-200">
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            {/* 商品情報 */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="text-2xl font-bold text-green-600 mb-4">
                {new Intl.NumberFormat('ja-JP', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                }).format(product.price / 1000000)} XYM
              </div>
              {product.description && (
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex justify-center">
              <button
                onClick={handleStartPayment}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                決済を開始
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
