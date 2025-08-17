"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Layout } from "../../components"
import { useTranslation } from "../../lib/i18n"

interface ProductImage {
  id: string
  url: string
  order: number
}

interface CustomField {
  id: string
  fieldName: string
  fieldType: string
  isRequired: boolean
}

interface Product {
  id: string
  uuid: string // 公開用UUID
  name: string
  price: number
  paymentAddress: string | null
  stock: number
  saleStartDate: string | null
  saleEndDate: string | null
  description: string | null
  callbackUrl: string | null
  images: ProductImage[]
  customFields: CustomField[]
  createdAt: string
}

// 画像ギャラリーコンポーネント
const ImageGallery = ({ images, productName }: { images: ProductImage[], productName: string }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { t } = useTranslation()

  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">{t("products.image")}なし</span>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <Image
        src={images[0].url}
        alt={productName}
        width={400}
        height={192}
        className="w-full h-48 object-cover"
      />
    )
  }

  return (
    <div className="relative">
      <Image
        src={images[currentImageIndex].url}
        alt={`${productName} - ${currentImageIndex + 1}`}
        width={400}
        height={192}
        className="w-full h-48 object-cover"
      />
      
      {/* 画像インジケーター */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentImageIndex 
                ? 'bg-white shadow-lg scale-110' 
                : 'bg-white/60 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* 画像枚数表示 */}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        {currentImageIndex + 1}/{images.length}
      </div>

      {/* ナビゲーションボタン */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentImageIndex((prev) => prev === images.length - 1 ? 0 : prev + 1)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 画像サムネイル（3枚以上の場合のみ表示） */}
      {images.length >= 3 && (
        <div className="absolute bottom-2 left-2 flex space-x-1">
          {images.slice(0, 3).map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-8 h-8 rounded border-2 overflow-hidden transition-all ${
                index === currentImageIndex ? 'border-white shadow-lg' : 'border-white/60'
              }`}
            >
              <Image
                src={image.url}
                alt={`${productName} thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          {images.length > 3 && (
            <div className="w-8 h-8 bg-black/60 rounded border-2 border-white/60 flex items-center justify-center">
              <span className="text-white text-xs">+{images.length - 3}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductList() {
  const { status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const [isMounted, setIsMounted] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingProductId, setProcessingProductId] = useState<string | null>(null)
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null)
  const [showImages, setShowImages] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // 画像表示設定とビューモードをlocalStorageから読み込み・保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedShowImages = localStorage.getItem('products-show-images')
      if (savedShowImages !== null) {
        setShowImages(JSON.parse(savedShowImages))
      }
      
      const savedViewMode = localStorage.getItem('products-view-mode')
      if (savedViewMode === 'list' || savedViewMode === 'grid') {
        setViewMode(savedViewMode)
      }
    }
  }, [])

  const toggleImageDisplay = () => {
    const newShowImages = !showImages
    setShowImages(newShowImages)
    if (typeof window !== 'undefined') {
      localStorage.setItem('products-show-images', JSON.stringify(newShowImages))
    }
  }

  const toggleViewMode = () => {
    const newViewMode = viewMode === 'grid' ? 'list' : 'grid'
    setViewMode(newViewMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('products-view-mode', newViewMode)
    }
  }
  // 決済ページを開く機能
  const handleOpenPayment = async (product: Product) => {
    try {
      console.log('決済ページ準備開始:', product.uuid)
      setProcessingProductId(product.uuid)
      
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

      console.log('APIレスポンス:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('APIエラー詳細:', errorData)
        throw new Error('決済の準備に失敗しました')
      }

      const data = await response.json()
      console.log('決済データ:', data)
      
      // セッションストレージに決済IDを保存（セキュリティ向上）
      const sessionKey = `payment_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(sessionKey, JSON.stringify({
        paymentId: data.paymentId,
        productId: product.id,
        timestamp: Date.now()
      }))
      
      // セッションキーベースの安全なURLで決済ページを開く
      const paymentUrl = `/payment/session/${sessionKey}`
      console.log('決済ページURL:', paymentUrl)
      
      // 新しいタブで決済ページを開く
      window.open(paymentUrl, '_blank', 'width=800,height=900,scrollbars=yes')
      
      console.log('決済ページを開きました')
      
    } catch (error) {
      console.error('決済ページを開けませんでした:', error)
      
      // エラーの詳細を表示
      if (error instanceof Error) {
        if (error.message === '決済の準備に失敗しました') {
          alert('決済の準備に失敗しました。\n・商品の在庫を確認してください\n・販売期間を確認してください')
        } else {
          alert(`エラーが発生しました: ${error.message}`)
        }
      } else {
        alert('決済ページの準備に失敗しました。もう一度お試しください。')
      }
    } finally {
      setProcessingProductId(null)    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchProducts()
    }
  }, [status, router, isMounted])

  // 共有メニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(null)
      }
    }

    if (shareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [shareMenuOpen])

  // 共有ボタンをクリックしたときの処理
  const handleShareToggle = (productId: string) => {
    setShareMenuOpen(shareMenuOpen === productId ? null : productId)
  }
  // URLをコピーする
  const handleCopyUrl = async (product: Product) => {
    try {
      // 商品詳細ページのURLを生成（決済は個別に開始される）
      const productUrl = `${window.location.origin}/products/${product.id}/view`
      await navigator.clipboard.writeText(productUrl)
      alert('商品URLをコピーしました！')
      setShareMenuOpen(null)
    } catch (error) {
      console.error('URLのコピーに失敗しました:', error)
      alert('URLのコピーに失敗しました')
    }
  }
  // SNS共有
  const handleSnsShare = (platform: string, product: Product) => {
    // 商品詳細ページのURLを生成
    const productUrl = `${window.location.origin}/products/${product.id}/view`
    const text = `${product.name} - ${formatPrice(product.price)} XYM`
      let url = ''
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}`
        break
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`
        break
      case 'line':
        url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(productUrl)}`
        break
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
      setShareMenuOpen(null)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        setError("商品の取得に失敗しました")
      }
    } catch {
      setError("商品の取得中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t("common.loading")}</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('ja-JP')
  }
  const formatPrice = (price: number) => {
    const xym = price / 1000000;
    return new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(xym);
  }
    return (
    <Layout title={t("products.list.title")}>
      <div className="py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("products.list.title")}</h1>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              {/* ビューモード切り替えボタン */}
              <button
                onClick={toggleViewMode}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  viewMode === 'grid' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    リスト表示
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    ギャラリー表示
                  </>
                )}
              </button>
              
              {/* 画像表示切り替えボタン */}
              <button
                onClick={toggleImageDisplay}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  showImages 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {showImages ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L7.05 7.05m2.828 2.828l4.243 4.243m0 0L12.707 12.707M14.12 14.12l2.829 2.829" />
                    </svg>
                    画像を非表示
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    画像を表示
                  </>
                )}
              </button>
              <a
                href="/products/register"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium text-center"
              >
                {t("products.addProduct")}
              </a>
            </div>
          </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t("products.noProducts")}</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">{t("products.list.noProductsDescription")}</p>
            <a
              href="/products/register"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
            >
              {t("products.addProduct")}
            </a>
          </div>        ) : (
          <div className={`${
            viewMode === 'grid'
              ? `grid gap-4 sm:gap-6 ${
                  showImages 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                    : 'grid-cols-1 sm:grid-cols-2'
                }`
              : 'space-y-0'
          }`}>
            {/* リスト表示時のテーブルヘッダー */}
            {viewMode === 'list' && (
              <div className="bg-white shadow-sm rounded-lg mb-4 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-9 gap-2 text-xs font-medium text-gray-700">
                  <div>登録日</div>
                  <div className="col-span-2">商品名</div>
                  <div>在庫数</div>
                  <div>価格</div>
                  <div>販売開始日</div>
                  <div>販売終了日</div>
                  <div>編集</div>
                  <div>共有・決済</div>
                </div>
              </div>
            )}

            {viewMode === 'list' ? (
              // リスト表示（テーブル形式）
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {products.map((product, index) => (
                  <div key={product.id} className={`px-4 py-3 grid grid-cols-9 gap-2 items-center text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index === products.length - 1 ? 'border-b-0' : ''
                  }`}>
                    {/* 登録日 */}
                    <div className="text-xs text-gray-600">
                      {formatDate(product.createdAt)}
                    </div>

                    {/* 商品名 */}
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900 truncate">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 truncate mt-1">{product.description}</div>
                      )}
                    </div>

                    {/* 在庫数 */}
                    <div className="text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.stock > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock}
                      </span>
                    </div>

                    {/* 価格 */}
                    <div className="font-medium text-gray-900">
                      {formatPrice(product.price)} XYM
                    </div>

                    {/* 販売開始日 */}
                    <div className="text-xs text-gray-600">
                      {product.saleStartDate ? formatDate(product.saleStartDate) : '-'}
                    </div>

                    {/* 販売終了日 */}
                    <div className="text-xs text-gray-600">
                      {product.saleEndDate ? formatDate(product.saleEndDate) : '-'}
                    </div>

                    {/* 編集ボタン */}
                    <div>
                      <a
                        href={`/products/${product.id}/edit`}
                        className="inline-flex items-center px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                      >
                        編集
                      </a>
                    </div>

                    {/* 共有・決済ボタン */}
                    <div className="flex space-x-1">
                      {/* 共有ボタン */}
                      <div className="relative" ref={shareMenuOpen === product.id ? shareMenuRef : null}>
                        <button 
                          onClick={() => handleShareToggle(product.id)}
                          className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          共有
                        </button>

                        {/* 共有ドロップダウンメニュー（上方向に表示） */}
                        {shareMenuOpen === product.id && (
                          <div className="absolute bottom-full mb-1 left-0 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                            <div className="py-1">
                              {/* URLコピー */}
                              <button
                                onClick={() => handleCopyUrl(product)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                URLコピー
                              </button>

                              <div className="border-t border-gray-100"></div>

                              {/* Twitter */}
                              <button
                                onClick={() => handleSnsShare('twitter', product)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                                Twitter
                              </button>

                              {/* Facebook */}
                              <button
                                onClick={() => handleSnsShare('facebook', product)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                Facebook
                              </button>

                              {/* LINE */}
                              <button
                                onClick={() => handleSnsShare('line', product)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                LINE
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 決済ボタン */}
                      <button 
                        onClick={() => handleOpenPayment(product)}
                        className={`inline-flex items-center px-2 py-1 text-xs rounded transition-colors ${
                          processingProductId === product.uuid
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        disabled={processingProductId === product.uuid}
                      >
                        {processingProductId === product.uuid ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            準備中
                          </>
                        ) : (
                          '決済'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // グリッド表示（既存のカード形式）
              products.map((product) => (
                <div key={product.id} className={`bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  viewMode === 'list' ? 'flex' : (showImages ? '' : 'flex')
                }`}>
                {/* 商品画像ギャラリー（画像表示ONかつグリッド表示の場合のみ） */}
                {showImages && viewMode === 'grid' && (
                  <ImageGallery images={product.images} productName={product.name} />
                )}

                {/* リスト表示時またはグリッド表示で画像非表示時の代替表示 */}
                {(viewMode === 'list' || !showImages) && (
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-200 flex items-center justify-center m-4 rounded-lg">
                    {product.images.length > 0 ? (
                      <div className="text-center">
                        <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500">{product.images.length}枚</span>
                      </div>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                )}

                <div className={`p-4 sm:p-6 ${viewMode === 'list' || !showImages ? 'flex-grow' : ''}`}>
                  <h3 className={`font-semibold text-gray-900 mb-2 ${
                    viewMode === 'grid' && showImages ? 'text-base sm:text-lg line-clamp-2' : 'text-lg'
                  }`}>{product.name}</h3>
                    
                  <div className={`space-y-2 text-xs sm:text-sm text-gray-600 ${
                    viewMode === 'list' || !showImages ? 'mb-4' : ''
                  }`}>
                    <div className="flex justify-between">
                      <span>{t("products.price")}:</span>
                      <span className="font-medium">{formatPrice(product.price)} XYM</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>{t("products.stock")}:</span>
                      <span className="font-medium">{product.stock}</span>
                    </div>
                    
                    {product.saleStartDate && (<div className="flex justify-between">
                        <span>{t("products.saleStartDate")}:</span>
                        <span className="text-xs">{formatDate(product.saleStartDate)}</span>
                      </div>
                    )}

                    {product.saleEndDate && (
                      <div className="flex justify-between">
                        <span>{t("products.saleEndDate")}:</span>
                        <span className="text-xs">{formatDate(product.saleEndDate)}</span>
                      </div>
                    )}

                    {/* 画像数とカスタムフィールド数の表示（グリッド表示で画像表示ONの場合のみ） */}
                    {viewMode === 'grid' && showImages && (
                      <div className="pt-2 border-t flex justify-between">
                        {product.images.length > 0 && (
                          <span className="text-xs text-blue-600 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {product.images.length}枚
                          </span>
                        )}
                        {product.customFields.length > 0 && (
                          <span className="text-xs text-green-600 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {product.customFields.length}項目
                          </span>
                        )}
                      </div>
                    )}

                    {/* リスト表示時または画像非表示時の追加情報 */}
                    {(viewMode === 'list' || !showImages) && (
                      <div className="pt-2 border-t flex justify-between text-xs">
                        <span className="text-blue-600">画像: {product.images.length}枚</span>
                        <span className="text-green-600">フィールド: {product.customFields.length}項目</span>
                      </div>
                    )}
                  </div>                  {product.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                      {product.description}
                    </p>
                  )}                  {/* 決済説明 */}
                  <div className="mt-3 p-2 bg-green-50 rounded-md">
                    <p className="text-xs text-green-700 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      クリックして決済ページを開く
                    </p>
                  </div>                  <div className="mt-4 space-y-2">
                    {/* 上段: 編集・共有ボタン */}
                    <div className="flex space-x-2">
                      {/* 編集ボタン */}
                      <a
                        href={`/products/${product.id}/edit`}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors text-center"
                      >
                        {t("common.edit")}
                      </a>

                      {/* 共有ボタン */}
                      <div className="relative flex-1" ref={shareMenuOpen === product.id ? shareMenuRef : null}>
                        <button 
                          onClick={() => handleShareToggle(product.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          共有
                          <svg className={`w-3 h-3 ml-1 transition-transform ${shareMenuOpen === product.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* 共有ドロップダウンメニュー（上方向に表示） */}
                        {shareMenuOpen === product.id && (
                          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                            <div className="py-1">
                              {/* URLコピー */}
                              <button
                                onClick={() => handleCopyUrl(product)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                URLをコピー
                              </button>

                              <div className="border-t border-gray-100"></div>

                              {/* Twitter */}
                              <button
                                onClick={() => handleSnsShare('twitter', product)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                                Twitter
                              </button>

                              {/* Facebook */}
                              <button
                                onClick={() => handleSnsShare('facebook', product)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                Facebook
                              </button>

                              {/* LINE */}
                              <button
                                onClick={() => handleSnsShare('line', product)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                </svg>
                                LINE
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 下段: 決済ボタン */}
                    <button 
                      onClick={() => handleOpenPayment(product)}
                      className={`w-full px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                        processingProductId === product.uuid
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      disabled={processingProductId === product.uuid}
                    >
                      {processingProductId === product.uuid ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          準備中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          決済
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        )}        </div>
      </div>
    </Layout>
  )
}
