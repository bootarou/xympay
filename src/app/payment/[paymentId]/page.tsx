'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PaymentQRDisplay } from '../../../components/PaymentQRDisplay'
import { useSettings } from '../../../hooks/useSettings'

interface CustomField {
  id: string
  fieldName: string
  fieldType: string
  isRequired: boolean
  options: string[] | null
}

interface PaymentInfo {
  paymentId: string
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled'
  amount: number
  recipientAddress: string
  expireAt: string
  remainingTime: {
    totalSeconds: number
    minutes: number
    seconds: number
    isExpired: boolean
  }
  product: {
    id: string
    uuid: string
    name: string
    price: number
    customFields: CustomField[]
  }
  formData: Record<string, string | number | boolean>
  transactionId?: string
  confirmedAt?: string
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.paymentId as string
  
  // 設定の読み込み
  const { settings } = useSettings()
  const isAutoConfirmEnabled = settings.autoPaymentMonitoring
  
  // デバッグ: 設定の読み込み状況をログ出力
  useEffect(() => {
    console.log('=== 設定読み込み状況 ===')
    console.log('settings:', settings)
    console.log('isAutoConfirmEnabled:', isAutoConfirmEnabled)
    console.log('localStorage xympay_auto_confirm:', localStorage.getItem('xympay_auto_confirm'))
    console.log('localStorage xympay_settings:', localStorage.getItem('xympay_settings'))
    console.log('========================')
  }, [settings, isAutoConfirmEnabled])
  
  // Hydration エラーを防ぐためのクライアントサイド確認
  const [isMounted, setIsMounted] = useState(false)
    // 基本状態
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'fallback' | 'error'>('connecting')
  const [remainingTime, setRemainingTime] = useState<{
    totalSeconds: number
    minutes: number
    seconds: number
    isExpired: boolean
  } | null>(null)
    // 2段階制御のための状態
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('payment') // デフォルトをpaymentに変更
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // ウォレット選択状態
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')

  // 決済情報を取得
  const fetchPaymentInfo = useCallback(async () => {
    try {
      console.log('決済情報を取得中:', `/api/payment/status/${paymentId}`)
      
      const response = await fetch(`/api/payment/status/${paymentId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('決済情報が見つかりません')
        }
        throw new Error(`決済情報の取得に失敗しました (${response.status})`)
      }
      
      const data = await response.json()
      console.log('決済情報:', data)
      
      setPaymentInfo(data)
      setFormData(data.formData || {})
      setRemainingTime(data.remainingTime)
      
      // カスタムフィールドがあり、まだ入力されていない場合はformステップから開始
      // すべて入力済みまたはカスタムフィールドがない場合はpaymentステップから開始
      const hasCustomFields = data.product.customFields && data.product.customFields.length > 0
      const hasFormData = data.formData && Object.keys(data.formData).length > 0
      
      console.log('=== ステップ判定（詳細） ===')
      console.log('product.customFields:', data.product.customFields)
      console.log('hasCustomFields:', hasCustomFields)
      console.log('customFields length:', data.product.customFields?.length || 0)
      console.log('formData from server:', data.formData)
      console.log('hasFormData:', hasFormData)
      console.log('formData keys count:', Object.keys(data.formData || {}).length)
      
      // 追加の詳細判定
      if (hasCustomFields) {
        console.log('📝 カスタムフィールドが存在するため、フォーム処理が必要')
        if (!hasFormData) {
          console.log('⚠️ フォームデータが未入力のため、フォームステップに設定')
          setCurrentStep('form')
        } else {
          console.log('✅ フォームデータが入力済みのため、決済ステップに設定')
          setCurrentStep('payment')
        }
      } else {
        console.log('🚀 カスタムフィールドなし - 直接決済ステップに設定')
        setCurrentStep('payment')
        // プラグインマネージャーベースのQRコード生成は PaymentQRDisplay コンポーネントが担当
      }
      
    } catch (err) {
      console.error('決済情報取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  // フォームデータ更新
  const handleFormChange = (fieldName: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // エラーがある場合はクリア
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: '' }))
    }
  }

  // フォームバリデーション
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!paymentInfo?.product.customFields) return errors

    paymentInfo.product.customFields.forEach(field => {
      const value = formData[field.fieldName]
      
      if (field.isRequired && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors[field.fieldName] = `${field.fieldName}は必須項目です`
      }
      
      // メールバリデーション
      if (field.fieldType === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors[field.fieldName] = '有効なメールアドレスを入力してください'
        }
      }
      
      // 数値バリデーション
      if (field.fieldType === 'number' && value && isNaN(Number(value))) {
        errors[field.fieldName] = '数値を入力してください'
      }
    })

    return errors
  }  // フォーム送信処理
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== フォーム送信開始 ===')
    console.log('paymentId:', paymentId)
    console.log('formData:', formData)
    
    // 期限切れチェック
    if (remainingTime?.isExpired) {
      setError('決済時間が経過しています。新しい決済を開始してください。')
      return
    }
    
    const errors = validateForm()
    console.log('バリデーション結果:', errors)
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      console.log('バリデーションエラーのため送信を中止')
      return
    }

    setIsSubmittingForm(true)
    
    try {
      console.log('API呼び出し開始:', `/api/payment/form/${paymentId}`)
      
      const response = await fetch(`/api/payment/form/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData })
      })

      console.log('APIレスポンス:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('APIエラー:', errorData)
        throw new Error(errorData.error || 'フォームデータの送信に失敗しました')
      }

      const responseData = await response.json()
      console.log('API成功レスポンス:', responseData)
      
      // 決済ステップに進む
      console.log('決済ステップに移行中...')
      console.log('現在のcurrentStep:', currentStep)
      setCurrentStep('payment')
      console.log('currentStepをpaymentに設定しました')      
      // プラグインマネージャーベースのQRコード生成は PaymentQRDisplay コンポーネントが担当
      
    } catch (err) {
      console.error('フォーム送信エラー:', err)
      setError(err instanceof Error ? err.message : 'フォームの送信に失敗しました')
    } finally {
      setIsSubmittingForm(false)
    }
  }  // ウィンドウを閉じる処理
  const handleClose = async () => {
    try {
      // 決済がpending状態の場合はキャンセル処理を実行
      if (paymentInfo?.status === 'pending') {
        const confirmed = window.confirm('決済をキャンセルしてページを閉じますか？')
        if (!confirmed) {
          return
        }

        setIsCancelling(true)

        try {
          console.log('決済キャンセル処理開始:', paymentInfo.paymentId)
          
          const response = await fetch(`/api/payment/cancel/${paymentInfo.paymentId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          })

          if (response.ok) {
            console.log('決済キャンセル完了')
          } else {
            console.warn('決済キャンセルAPIエラー:', response.status)
            // エラーでも続行（ウィンドウは閉じる）
          }
        } catch (error) {
          console.error('決済キャンセル処理エラー:', error)
          // エラーでも続行（ウィンドウは閉じる）
        } finally {
          setIsCancelling(false)
        }
      } else {
        // pending以外の状態（期限切れ、完了済み等）の場合は確認なしで閉じる
        console.log('決済状態:', paymentInfo?.status, '- 確認なしでページを閉じます')
      }

      // ウィンドウクローズ処理
      if (window.opener || window.parent !== window) {
        // ポップアップまたはiframe内の場合
        window.close()
        return
      }
      
      // 通常のタブ/ウィンドウの場合
      // ブラウザによっては直接閉じることができないため、まず試行
      window.close()
      
      // 閉じることができなかった場合は前のページに戻る
      setTimeout(() => {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          // 最後の手段として空白ページに移動
          window.location.href = 'about:blank'
        }
      }, 100)
      
    } catch (error) {
      console.error('ウィンドウクローズエラー:', error)
      setIsCancelling(false)
      // エラーが発生した場合は前のページに戻る
      if (window.history.length > 1) {
        window.history.back()
      }
    }
  }  // クライアントサイドマウント確認
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // SSE接続でリアルタイム着金監視
  useEffect(() => {
    console.log('=== SSE監視useEffect実行 ===')
    console.log('useEffect dependency values:', {
      paymentId,
      isMounted,
      currentStep,
      paymentInfo: !!paymentInfo,
      router: !!router,
      isAutoConfirmEnabled,
      settings: !!settings
    })
    
    console.log('条件チェック（詳細）:', {
      paymentId: paymentId,
      hasPaymentId: !!paymentId,
      isMounted,
      currentStep,
      stepIsPayment: currentStep === 'payment',
      hasPaymentInfo: !!paymentInfo,
      paymentStatus: paymentInfo?.status,
      statusIsPending: paymentInfo?.status === 'pending',
      isAutoConfirmEnabled,
      settingsLoaded: !!settings
    })
    
    console.log('各条件の評価:')
    console.log('  paymentId:', !!paymentId, paymentId)
    console.log('  isMounted:', isMounted)
    console.log('  currentStep === "payment":', currentStep === 'payment', `(currentStep: "${currentStep}")`)
    console.log('  hasPaymentInfo:', !!paymentInfo)
    console.log('  paymentInfo?.status === "pending":', paymentInfo?.status === 'pending', `(status: "${paymentInfo?.status}")`)
    console.log('  isAutoConfirmEnabled:', isAutoConfirmEnabled)
    
    // 自動確認が無効の場合は監視しない
    if (!isAutoConfirmEnabled) {
      console.log('❌ 自動決済確認が無効のため、SSE監視をスキップします')
      return
    }
    
    // 条件を緩和してテスト用にSSE監視を強制実行
    const allConditionsMet = !!paymentId && isMounted && !!paymentInfo
    console.log('🔍 緩和された条件を満たすか:', allConditionsMet)
    console.log('🧪 テスト用：決済ステップかつpending状態の場合のみSSE開始予定')
    
    if (!allConditionsMet) {
      console.log('❌ 基本条件（paymentId, isMounted, paymentInfo）を満たしていません。')
      return
    }

    // ステップと決済状態の最終チェック
    if (currentStep !== 'payment') {
      console.log(`❌ 現在のステップが決済ステップではありません: ${currentStep}`)
      return
    }

    if (paymentInfo?.status !== 'pending') {
      console.log(`❌ 決済状態がpendingではありません: ${paymentInfo?.status}`)
      return
    }

    console.log('=== SSE着金監視開始 ===')
    console.log('paymentId:', paymentId)
    console.log('currentStep:', currentStep)
    console.log('paymentStatus:', paymentInfo?.status)
    console.log('autoConfirm:', isAutoConfirmEnabled)

    let eventSource: EventSource | null = null
    let fallbackInterval: NodeJS.Timeout | null = null
    let retryCount = 0
    const maxRetries = 3

    const startSSEConnection = () => {
      try {
        setSseStatus('connecting')
        console.log('SSE接続を開始:', `/api/payment/monitor/${paymentId}`)
        eventSource = new EventSource(`/api/payment/monitor/${paymentId}`)

        eventSource.onopen = () => {
          console.log('SSE接続が確立されました')
          setSseStatus('connected')
          retryCount = 0 // 接続成功時はリトライ回数をリセット
        }

        eventSource.onmessage = (event) => {
          try {
            console.log('SSEデータ受信:', event.data)
            const data = JSON.parse(event.data)
            
            if (data.status === 'confirmed') {
              console.log('🎉 着金検知！決済完了')
              setPaymentInfo(prev => prev ? {
                ...prev,
                status: 'confirmed',
                transactionId: data.transactionId,
                confirmedAt: data.confirmedAt
              } : null)
              
              // 決済完了後、少し待ってから完了画面に遷移
              setTimeout(() => {
                router.push(`/payment/${paymentId}/complete`)
              }, 2000)
              
            } else if (data.status === 'expired') {
              console.log('⏰ 決済期限切れ')
              setPaymentInfo(prev => prev ? { ...prev, status: 'expired' } : null)
              setError('決済期限が切れました')
              
            } else if (data.status === 'error') {
              console.error('SSEエラー受信:', data.message)
              setError(data.message || '決済監視中にエラーが発生しました')
            }
            
          } catch (err) {
            console.error('SSEデータの解析エラー:', err)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE接続エラー:', error)
          console.error('EventSource readyState:', eventSource?.readyState)
          console.error('EventSource URL:', eventSource?.url)
          
          if (eventSource?.readyState === EventSource.CLOSED) {
            console.log('SSE接続が閉じられました。リトライ回数:', retryCount)
            
            if (retryCount < maxRetries) {
              retryCount++
              console.log(`SSE再接続を試行します (${retryCount}/${maxRetries})`)
              setTimeout(() => {
                startSSEConnection()
              }, 2000 * retryCount) // 指数バックオフ
            } else {
              console.log('SSE最大リトライ回数に達しました。ポーリング方式に切り替えます。')
              setSseStatus('fallback')
              startFallbackPolling()
            }
          }
        }

      } catch (error) {
        console.error('SSE接続の作成に失敗:', error)
        setSseStatus('fallback')
        startFallbackPolling()
      }
    }

    // フォールバック：ポーリング方式
    const startFallbackPolling = () => {
      console.log('ポーリング方式での決済監視を開始')
      fallbackInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payment/status/${paymentId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.status === 'confirmed') {
              console.log('🎉 ポーリングで着金検知！決済完了')
              setPaymentInfo(prev => prev ? {
                ...prev,
                status: 'confirmed',
                transactionId: data.transactionId,
                confirmedAt: data.confirmedAt
              } : null)
              
              setTimeout(() => {
                router.push(`/payment/${paymentId}/complete`)
              }, 2000)
              
              if (fallbackInterval) {
                clearInterval(fallbackInterval)
              }
            } else if (data.status === 'expired') {
              console.log('⏰ ポーリングで期限切れ検知')
              setPaymentInfo(prev => prev ? { ...prev, status: 'expired' } : null)
              setError('決済期限が切れました')
              if (fallbackInterval) {
                clearInterval(fallbackInterval)
              }
            }
          }
        } catch (err) {
          console.error('ポーリング中のエラー:', err)
        }
      }, 5000) // 5秒間隔でポーリング
    }

    // SSE接続を開始
    startSSEConnection()

    return () => {
      console.log('=== SSE着金監視終了 ===')
      if (eventSource) {
        eventSource.close()
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
      }
    }
  }, [paymentId, isMounted, currentStep, paymentInfo, router, isAutoConfirmEnabled, settings])

  // 初回データ取得
  useEffect(() => {
    if (isMounted) {
      fetchPaymentInfo()
    }
  }, [paymentId, isMounted, fetchPaymentInfo])
  // 残り時間更新用のタイマー
  useEffect(() => {
    if (!paymentInfo || paymentInfo.status !== 'pending') return

    const timer = setInterval(() => {
      const now = new Date()
      const expireTime = new Date(paymentInfo.expireAt)
      const totalSeconds = Math.max(0, Math.floor((expireTime.getTime() - now.getTime()) / 1000))
      
      if (totalSeconds <= 0) {
        setRemainingTime({
          totalSeconds: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        })
        setError('決済時間が経過しました')
        clearInterval(timer)
        return
      }

      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      setRemainingTime({
        totalSeconds,
        minutes,
        seconds,
        isExpired: false
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentInfo])

  // フォーム入力フィールドのレンダリング
  const renderFormField = (field: CustomField) => {
    const value = formData[field.fieldName] || ''
    const stringValue = typeof value === 'string' ? value : String(value)
    const error = formErrors[field.fieldName]

    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'date':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.fieldName}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.fieldType}
              value={stringValue}
              onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
              placeholder={`${field.fieldName}を入力してください`}
              className={baseInputClasses}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.fieldName}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={stringValue}
              onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
              placeholder={`${field.fieldName}を入力してください`}
              rows={4}
              className={baseInputClasses}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.fieldName}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={stringValue}
              onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
              className={baseInputClasses}
            >
              <option value="">選択してください</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )

      case 'radio':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.fieldName}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="radio"
                    name={field.fieldName}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleFormChange(field.fieldName, e.target.checked)}
                className="mr-2"
              />
              {field.fieldName}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )

      default:
        return null
    }
  }
  // Hydration エラーを防ぐため、クライアントサイドでマウントされるまで待機
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">決済情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー画面
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>            <p className="text-gray-600 mb-6">{error}</p>            <button
              onClick={handleClose}
              disabled={isCancelling}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
            >
              {isCancelling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  処理中...
                </>
              ) : (
                '閉じる'
              )}
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
          
          {/* デバッグ情報表示 */}
          <div className="bg-yellow-100 p-4 border-b">
            <h4 className="font-bold text-sm">🔍 デバッグ情報</h4>
            <div className="text-xs mt-2 space-y-1">
              <div>currentStep: <span className="font-mono bg-gray-200 px-1">{currentStep}</span></div>
              <div>paymentStatus: <span className="font-mono bg-gray-200 px-1">{paymentInfo.status}</span></div>
              <div>customFields数: <span className="font-mono bg-gray-200 px-1">{paymentInfo.product.customFields?.length || 0}</span></div>
              <div>formData keys: <span className="font-mono bg-gray-200 px-1">{Object.keys(formData).length}</span></div>
              <div>isMounted: <span className="font-mono bg-gray-200 px-1">{isMounted.toString()}</span></div>
            </div>
          </div>

          {/* ヘッダー */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">Symbol決済</h1>
                <p className="opacity-90">商品: {paymentInfo.product.name}</p>
                
                {/* SSE接続状態表示 */}
                {currentStep === 'payment' && paymentInfo.status === 'pending' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      sseStatus === 'connected' ? 'bg-green-400' :
                      sseStatus === 'connecting' ? 'bg-yellow-400' :
                      sseStatus === 'fallback' ? 'bg-orange-400' :
                      'bg-red-400'
                    }`}></div>
                    <span className="text-xs opacity-80">
                      {sseStatus === 'connected' ? '🔗 リアルタイム監視中' :
                       sseStatus === 'connecting' ? '🔄 監視接続中...' :
                       sseStatus === 'fallback' ? '📡 ポーリング監視中' :
                       '❌ 監視エラー'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 残り時間表示 */}
              {remainingTime && paymentInfo.status === 'pending' && (
                <div className={`text-center ${remainingTime.isExpired ? 'text-red-200' : remainingTime.totalSeconds <= 60 ? 'text-yellow-200' : 'text-white'}`}>
                  <div className="text-sm opacity-90">残り時間</div>
                  <div className="text-xl font-mono font-bold">
                    {remainingTime.isExpired ? (
                      '期限切れ'
                    ) : (
                      `${remainingTime.minutes.toString().padStart(2, '0')}:${remainingTime.seconds.toString().padStart(2, '0')}`
                    )}
                  </div>
                  {!remainingTime.isExpired && remainingTime.totalSeconds <= 60 && (
                    <div className="text-xs opacity-80">まもなく期限切れ</div>
                  )}
                </div>
              )}
            </div>
            
            {/* ステップ表示 */}
            {paymentInfo.product.customFields && paymentInfo.product.customFields.length > 0 && (
              <div className="mt-4 flex items-center space-x-4">
                <div className={`flex items-center ${currentStep === 'form' ? 'text-white' : 'text-blue-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                    currentStep === 'form' ? 'bg-white text-blue-600' : 
                    currentStep === 'payment' ? 'bg-blue-400 text-white' : 'bg-blue-700 text-blue-300'
                  }`}>
                    1
                  </div>
                  <span className="text-sm">情報入力</span>
                </div>
                <div className="flex-1 h-0.5 bg-blue-400"></div>
                <div className={`flex items-center ${currentStep === 'payment' ? 'text-white' : 'text-blue-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                    currentStep === 'payment' ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-300'
                  }`}>
                    2
                  </div>
                  <span className="text-sm">決済</span>
                </div>
              </div>
            )}
          </div>

          {/* コンテンツ */}
          <div className="p-6">
            {/* デバッグ情報パネル */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-bold text-yellow-800 mb-2">🔍 デバッグ情報</h3>
              <div className="text-xs text-yellow-700 space-y-1">
                <div><strong>現在のステップ:</strong> {currentStep}</div>
                <div><strong>決済ステータス:</strong> {paymentInfo?.status}</div>
                <div><strong>カスタムフィールド数:</strong> {paymentInfo?.product.customFields?.length || 0}</div>
                <div><strong>フォームデータのキー数:</strong> {Object.keys(formData).length}</div>
                <div><strong>isMounted:</strong> {isMounted ? 'true' : 'false'}</div>
                <div><strong>SSE状態:</strong> {sseStatus}</div>
                <div><strong>自動決済確認:</strong> {isAutoConfirmEnabled ? '🟢 有効' : '🔴 無効'}</div>
                <div><strong>SSE監視条件:</strong> 
                  paymentId={!!paymentId ? '✓' : '❌'}, 
                  mounted={isMounted ? '✓' : '❌'}, 
                  step={currentStep === 'payment' ? '✓' : '❌'}, 
                  info={!!paymentInfo ? '✓' : '❌'}, 
                  pending={paymentInfo?.status === 'pending' ? '✓' : '❌'},
                  autoConfirm={isAutoConfirmEnabled ? '✓' : '❌'}
                </div>
                <div><strong>paymentId:</strong> {paymentId}</div>
                <div><strong>カスタムフィールド:</strong> {JSON.stringify(paymentInfo?.product.customFields || [], null, 2)}</div>
                <div><strong>フォームデータ:</strong> {JSON.stringify(formData, null, 2)}</div>
              </div>
            </div>
            
            {currentStep === 'form' ? (
              // Step 1: フォーム入力画面
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">追加情報の入力</h2>
                
                <form onSubmit={handleFormSubmit}>
                  {paymentInfo.product.customFields?.map(field => renderFormField(field))}
                    <div className="flex justify-between mt-8">                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isCancelling || isSubmittingForm}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isCancelling ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          キャンセル中...
                        </>
                      ) : (
                        'キャンセル'
                      )}
                    </button>
                      <button
                      type="submit"
                      disabled={isSubmittingForm || remainingTime?.isExpired}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {remainingTime?.isExpired ? (
                        '期限切れ'
                      ) : isSubmittingForm ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          送信中...
                        </>
                      ) : (
                        '次へ進む'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Step 2: 決済画面
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">決済情報</h2>
                
                {/* 決済詳細 */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">決済詳細</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品:</span>
                      <span className="font-medium">{paymentInfo.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">金額:</span>
                      <span className="font-medium">{(paymentInfo.amount / 1000000).toFixed(6).replace(/\.?0+$/, '')} XYM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">決済ID:</span>
                      <span className="font-mono text-xs">{paymentInfo.paymentId.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                {/* QRコード・ウォレット選択表示 */}
                {paymentInfo.status === 'pending' && (
                  <div className="mb-6">
                    {!isAutoConfirmEnabled && (
                      <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="text-orange-600 mr-2">⚠️</div>
                          <div>
                            <p className="text-sm text-orange-800 font-medium">
                              自動決済確認が無効です
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              設定ページで「自動決済確認」を有効にすると、着金を自動検知します。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <PaymentQRDisplay
                      paymentData={{
                        paymentId: paymentInfo.paymentId,
                        productId: paymentInfo.product.id,
                        recipientAddress: paymentInfo.recipientAddress,
                        amount: paymentInfo.amount,
                        message: paymentInfo.paymentId,
                        expireAt: new Date(paymentInfo.expireAt)
                      }}
                      onWalletChange={setSelectedWalletId}
                      defaultWalletId={selectedWalletId}
                    />
                  </div>
                )}

                {/* 残り時間 */}
                {paymentInfo.status === 'pending' && remainingTime && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">残り時間</h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-red-600">
                        {remainingTime.minutes}:{String(remainingTime.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-sm text-gray-500">
                        ({remainingTime.totalSeconds}秒)
                      </div>
                    </div>
                    {remainingTime.isExpired && (
                      <p className="text-xs text-red-500 mt-1">
                        決済時間が経過しました
                      </p>
                    )}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex justify-center mt-6 space-x-4">
                  <button
                    onClick={handleClose}
                    disabled={isCancelling}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isCancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        処理中...
                      </>
                    ) : paymentInfo.status === 'pending' ? (
                      'キャンセル'
                    ) : (
                      '閉じる'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
