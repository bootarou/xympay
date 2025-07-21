"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Layout } from "../../../components"
import { useTranslation } from "../../../lib/i18n"

interface CustomField {
    id: string
    fieldName: string
    fieldType: string
    isRequired: boolean
    options?: string[]
}

interface Address {
    id: string
    name: string
    address: string
    type: string
    description?: string
    isDefault: boolean
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

export default function ProductRegister() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { t } = useTranslation()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [product, setProduct] = useState<ProductForm>({
        name: "",
        price: "",
        paymentAddress: "",        stock: "",
        saleStartDate: "",
        saleEndDate: "",
        description: "",        callbackUrl: "",
    })

    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [addresses, setAddresses] = useState<Address[]>([])
    const [addressesLoading, setAddressesLoading] = useState(false)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
        } else if (status === "authenticated") {
            fetchAddresses()
        }
    }, [status, router])

    const fetchAddresses = async () => {
        try {
            setAddressesLoading(true)
            const response = await fetch("/api/addresses")
            if (response.ok) {
                const data = await response.json()
                setAddresses(data)
                
                // デフォルトアドレスがある場合は自動選択
                const defaultAddress = data.find((addr: Address) => addr.isDefault)
                if (defaultAddress && !product.paymentAddress) {
                    setProduct(prev => ({
                        ...prev,
                        paymentAddress: defaultAddress.address
                    }))
                }
            }
        } catch (error) {
            console.error("アドレス取得エラー:", error)
        } finally {
            setAddressesLoading(false)
        }
    }

    if (status === "loading") {
        return (            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">{t("common.loading")}</div>
            </div>
        )
    }

    if (status === "unauthenticated") {
        return null
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

        if (images.length + files.length > 5) {
            setError(t("products.register.validation.maxImages"))
            return
        }

        setImages(prev => [...prev, ...files])

        // プレビュー用のURL生成
        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
                setImagePreviews(prev => [...prev, e.target?.result as string])
            }
            reader.readAsDataURL(file)
        })

        // ファイル入力をリセット
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const addCustomField = () => {
        const newField: CustomField = {
            id: Date.now().toString(),
            fieldName: "",
            fieldType: "text",
            isRequired: false,
        }
        setCustomFields(prev => [...prev, newField])
    }

    const updateCustomField = (id: string, field: string, value: any) => {
        setCustomFields(prev => prev.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        ))
    }

    const removeCustomField = (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess("")

        try {
            // 商品データの検証
            if (!product.name || !product.price) {
                setError(t("products.register.validation.namePriceRequired"))
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

            // 画像ファイルを追加
            images.forEach((image, index) => {
                formData.append(`image_${index}`, image)
            })            // カスタムフィールドを追加
            formData.append('customFields', JSON.stringify(customFields))

            const response = await fetch("/api/products", {
                method: "POST",
                body: formData,
            })

            if (response.ok) {
                setSuccess(t("products.register.success"))
                // フォームをリセット
                setProduct({
                    name: "",
                    price: "",
                    paymentAddress: "",
                    stock: "",
                    saleStartDate: "",
                    saleEndDate: "",
                    description: "",
                    callbackUrl: "",
                })
                setImages([])
                setImagePreviews([])
                setCustomFields([])            } else {
                const data = await response.json()
                setError(data.error || t("products.register.error"))
            }
        } catch (error) {
            setError(t("products.register.error"))
        } finally {
            setIsLoading(false)
        }
    }
    
    return (        <Layout title={t("products.register.title")}>
            <div className="py-4 sm:py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow-lg rounded-lg">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("products.register.title")}</h1>
                        </div>                    <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-6 space-y-6">
                        {/* 基本情報 */}                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">{t("products.basicInfo")}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        {t("products.register.labels.nameField")} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={product.name}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                    />
                                </div>                                <div>
                                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                        {t("products.register.labels.priceField")} (XYM) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={product.price}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                                <div>
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="paymentAddress" className="block text-sm font-medium text-gray-700">
                                            {t("products.register.labels.paymentAddressField")}
                                        </label>
                                        {!addressesLoading && (
                                            <button
                                                type="button"
                                                onClick={fetchAddresses}
                                                className="text-indigo-600 hover:text-indigo-500 text-sm flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                {t("products.register.addressSelection.refresh")}
                                            </button>
                                        )}
                                    </div>
                                    {addressesLoading ? (
                                        <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-500 text-sm">
                                            {t("common.loading")}...
                                        </div>
                                    ) : addresses.length > 0 ? (
                                        <div className="mt-1 space-y-2">
                                            <select
                                                id="paymentAddress"
                                                name="paymentAddress"
                                                value={product.paymentAddress}
                                                onChange={handleInputChange}
                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"                                            >
                                                <option value="">{t("products.register.addressSelection.selectAddress")}</option>
                                                {addresses.map((address) => (
                                                    <option key={address.id} value={address.address}>
                                                        {address.name} ({address.address.slice(0, 8)}...{address.address.slice(-8)})
                                                        {address.isDefault && t("products.register.addressSelection.defaultLabel")}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    {t("products.register.addressSelection.noAddressHelp")}
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push("/addresses")}
                                                        className="text-indigo-600 hover:text-indigo-500 underline ml-1"
                                                    >
                                                        {t("products.register.addressSelection.addressManagementLink")}
                                                    </button>
                                                    {t("products.register.addressSelection.addAddressHelp")}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-1 space-y-2">
                                            <input
                                                type="text"
                                                id="paymentAddress"
                                                name="paymentAddress"                                                value={product.paymentAddress}
                                                onChange={handleInputChange}
                                                placeholder={t("products.register.addressSelection.directInputPlaceholder")}
                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                            />
                                            <div className="flex items-center text-sm text-gray-500">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push("/addresses")}
                                                        className="text-indigo-600 hover:text-indigo-500 underline"
                                                    >
                                                        {t("products.register.addressSelection.addressManagementLink")}
                                                    </button>
                                                    {t("products.register.addressSelection.registerAddressHelp")}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div><div>
                                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                                        {t("products.register.labels.stockField")}
                                    </label>
                                    <input
                                        type="number"
                                        id="stock"
                                        name="stock"
                                        value={product.stock}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                    />
                                </div>
                            </div>

                            {/* 販売期間 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                                <div>
                                    <label htmlFor="saleStartDate" className="block text-sm font-medium text-gray-700">
                                        {t("products.register.labels.saleStartDateField")}
                                    </label>
                                    <input
                                        type="date"
                                        id="saleStartDate"
                                        name="saleStartDate"
                                        value={product.saleStartDate}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                    />
                                </div>                                <div>
                                    <label htmlFor="saleEndDate" className="block text-sm font-medium text-gray-700">
                                        {t("products.register.labels.saleEndDateField")}
                                    </label>
                                    <input
                                        type="date"
                                        id="saleEndDate"
                                        name="saleEndDate"
                                        value={product.saleEndDate}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                    />
                                </div>
                            </div>                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                    {t("products.register.labels.remarksField")}
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

                        {/* 商品画像 */}                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">{t("products.register.labels.imagesSection")}</h3>

                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />                                <p className="mt-1 text-sm text-gray-500">
                                    {t("products.register.imageUpload.notSelected")} {images.length > 0 && `(${images.length}${t("products.register.imageUpload.selectedCount")})`}
                                </p>
                            </div>

                            {/* 画像プレビュー */}
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative">                                            <img
                                                src={preview}
                                                alt={`${t("products.register.imageUpload.altText")} ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-md border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                {t("products.register.imageUpload.remove")}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 追加フォーム項目 */}                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">{t("products.register.labels.customFieldsSection")}</h3>
                                <button
                                    type="button"
                                    onClick={addCustomField}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    {t("products.register.labels.addField")}
                                </button>
                            </div>

                            {customFields.map((field) => (
                                <div key={field.id} className="border border-gray-200 rounded-md p-4">                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">{t("products.register.labels.fieldNamePlaceholder")}</label>
                                            <input
                                                type="text"
                                                value={field.fieldName}
                                                onChange={(e) => updateCustomField(field.id, 'fieldName', e.target.value)}
                                                placeholder={t("products.register.labels.fieldNamePlaceholder")}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">{t("products.register.labels.fieldTypeLabel")}</label>
                                            <select
                                                value={field.fieldType}
                                                onChange={(e) => updateCustomField(field.id, 'fieldType', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="text">{t("products.register.fieldTypeOptions.text")}</option>
                                                <option value="email">{t("products.register.fieldTypeOptions.email")}</option>
                                                <option value="number">{t("products.register.fieldTypeOptions.number")}</option>
                                                <option value="textarea">{t("products.register.fieldTypeOptions.textarea")}</option>
                                                <option value="checkbox">{t("products.register.fieldTypeOptions.checkbox")}</option>
                                                <option value="select">{t("products.register.fieldTypeOptions.select")}</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`required-${field.id}`}
                                                checked={field.isRequired}
                                                onChange={(e) => updateCustomField(field.id, 'isRequired', e.target.checked)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`required-${field.id}`} className="ml-2 text-sm text-gray-700">
                                                {t("products.register.labels.requiredLabel")}
                                            </label>
                                        </div>

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(field.id)}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                                            >
                                                {t("products.register.labels.deleteField")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* コールバックURL */}                        <div>
                            <label htmlFor="callbackUrl" className="block text-sm font-medium text-gray-700">
                                {t("products.register.labels.callbackUrlField")}
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

                        {/* ボタン */}                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-md text-lg font-medium"
                                disabled={isLoading}
                            >
                                {t("products.register.buttons.cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-medium disabled:opacity-50"
                            >
                                {isLoading ? t("products.register.buttons.registering") : t("products.register.buttons.register")}
                            </button>
                        </div>
                    </form>
                </div>
                </div>
            </div>
        </Layout>
    )
}
