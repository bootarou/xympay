"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Layout } from "../../../../components"
import { useTranslation } from "../../../../lib/i18n"

interface CustomField {
  id?: string
  fieldName: string
  fieldType: string
  isRequired: boolean
  options?: string[]
}

interface ProductImage {
  id: string
  url: string
  order: number
}

interface Product {
  id: string
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
}

interface ProductForm {
  name: string
  price: string
  paymentAddress: string
  stock: string
  saleStartDate: string
  saleEndDate: string
  description: string
  callbackUrl: string
}

export default function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  
  const [productId, setProductId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [product, setProduct] = useState<ProductForm>({
    name: "",
    price: "",
    paymentAddress: "",
    stock: "",
    saleStartDate: "",
    saleEndDate: "",
    description: "",
    callbackUrl: "",
  })
  
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  useEffect(() => {
    // paramsを非同期で解決
    const initializeProductId = async () => {
      const resolvedParams = await params
      setProductId(resolvedParams.id)
    }
    
    initializeProductId()
  }, [params])

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && productId) {
      fetchProduct()
    }
  }, [status, productId, router])
  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data: Product = await response.json()
        setProduct({
          name: data.name,
          price: (data.price / 1000000).toString(), // μXYMからXYMに変換
          paymentAddress: data.paymentAddress || "",
          stock: data.stock.toString(),
          saleStartDate: data.saleStartDate ? data.saleStartDate.split('T')[0] : "",
          saleEndDate: data.saleEndDate ? data.saleEndDate.split('T')[0] : "",
          description: data.description || "",
          callbackUrl: data.callbackUrl || "",
        })
        setExistingImages(data.images)
        setCustomFields(data.customFields || [])
      } else if (response.status === 404) {
        setError("商品が見つかりません")
      } else {
        setError("商品情報の取得に失敗しました")
      }
    } catch (error) {
      setError("商品情報の取得中にエラーが発生しました")
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

  if (error && !product.name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">{error}</h2>
          <button
            onClick={() => router.push("/products")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            商品一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProduct(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (existingImages.length + newImages.length + files.length > 5) {
      setError("画像は最大5枚まで選択できます")
      return
    }

    setNewImages(prev => [...prev, ...files])
    
    // プレビュー用のURL生成
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeExistingImage = (imageId: string) => {
    setImagesToDelete(prev => [...prev, imageId])
    setExistingImages(prev => prev.filter(img => img.id !== imageId))
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addCustomField = () => {
    const newField: CustomField = {
      id: `temp_${Date.now()}`,
      fieldName: "",
      fieldType: "text",
      isRequired: false,
    }
    setCustomFields(prev => [...prev, newField])
  }

  const updateCustomField = (index: number, updatedField: Partial<CustomField>) => {
    setCustomFields(prev => 
      prev.map((field, i) => 
        i === index ? { ...field, ...updatedField } : field
      )
    )
  }

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      // 商品データの検証
      if (!product.name || !product.price) {
        setError("商品名と価格は必須です")
        return
      }

      const formData = new FormData()
      
      // 商品データを追加
      Object.entries(product).forEach(([key, value]) => {
        if (key === 'price') {
          // XYMからμXYMに変換
          const priceInMicroXYM = Math.round(parseFloat(value) * 1000000);
          formData.append(key, priceInMicroXYM.toString());
        } else {
          formData.append(key, value);
        }
      })
      
      // 新しい画像ファイルを追加
      newImages.forEach((image, index) => {
        formData.append(`new_image_${index}`, image)
      })
      
      // 削除する画像IDを追加
      formData.append('imagesToDelete', JSON.stringify(imagesToDelete))
        // カスタムフィールドを追加
      formData.append('customFields', JSON.stringify(customFields))

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        body: formData,
      })

      if (response.ok) {
        setSuccess("商品が正常に更新されました")
        // 少し待ってから商品一覧に戻る
        setTimeout(() => {
          router.push("/products")
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || "商品更新に失敗しました")
      }
    } catch (error) {      setError("商品更新中にエラーが発生しました")
    } finally {
      setIsSaving(false)
    }
  }
  return (
    <Layout title={t("products.editProduct")}>
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t("products.editProduct")}</h1>
                <button
                  onClick={() => router.push("/products")}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← {t("navigation.products.list")}
                </button>
              </div>
            </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    商品名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    価格 (XYM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={product.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.000001"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="paymentAddress" className="block text-sm font-medium text-gray-700">
                    支払い先アドレス
                  </label>
                  <input
                    type="text"
                    id="paymentAddress"
                    name="paymentAddress"
                    value={product.paymentAddress}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                    在庫数
                  </label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={product.stock}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="saleStartDate" className="block text-sm font-medium text-gray-700">
                    販売開始日
                  </label>
                  <input
                    type="date"
                    id="saleStartDate"
                    name="saleStartDate"
                    value={product.saleStartDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="saleEndDate" className="block text-sm font-medium text-gray-700">
                    販売終了日
                  </label>
                  <input
                    type="date"
                    id="saleEndDate"
                    name="saleEndDate"
                    value={product.saleEndDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  商品説明
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={product.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 商品画像 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">商品画像（最大5枚）</h2>
              
              {/* 既存画像 */}
              {existingImages.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-700 mb-2">現在の画像</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.url}
                          alt={`商品画像 ${image.order}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 新しい画像 */}
              {newImagePreviews.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-700 mb-2">追加する画像</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`新しい画像 ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 画像追加 */}
              {existingImages.length + newImages.length < 5 && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400 transition-colors"
                  >
                    <div className="text-gray-600">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm font-medium">画像を追加</p>
                      <p className="text-xs text-gray-500">JPG, PNG, GIF（最大5枚）</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* カスタムフィールド */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">カスタムフォーム項目</h2>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  + 項目追加
                </button>
              </div>

              {customFields.map((field, index) => (
                <div key={field.id || index} className="border border-gray-200 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">項目名</label>
                      <input
                        type="text"
                        value={field.fieldName}
                        onChange={(e) => updateCustomField(index, { fieldName: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="項目名（例：メールアドレス）"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">タイプ</label>
                      <select
                        value={field.fieldType}
                        onChange={(e) => updateCustomField(index, { fieldType: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="text">テキスト</option>
                        <option value="email">メール</option>
                        <option value="number">数値</option>
                        <option value="tel">電話番号</option>
                        <option value="url">URL</option>
                        <option value="textarea">長文テキスト</option>
                        <option value="select">選択肢</option>
                        <option value="radio">ラジオボタン</option>
                        <option value="checkbox">チェックボックス</option>
                        <option value="date">日付</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(e) => updateCustomField(index, { isRequired: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">必須</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* コールバックURL */}
            <div>
              <label htmlFor="callbackUrl" className="block text-sm font-medium text-gray-700">
                コールバックURL
              </label>
              <input
                type="url"
                id="callbackUrl"
                name="callbackUrl"
                value={product.callbackUrl}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* メッセージ表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-green-800 text-sm">{success}</div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium"
              >
                キャンセル
              </button>
              
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50"
              >                {isSaving ? "更新中..." : "商品を更新"}
              </button>
            </div>          </form>
        </div>
        </div>
      </div>
    </Layout>
  )
}
