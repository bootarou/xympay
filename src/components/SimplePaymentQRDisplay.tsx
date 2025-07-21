import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'

interface PaymentQRDisplayProps {
  paymentData: {
    recipientAddress: string
    amount: number | string
    paymentId: string
  }
  className?: string
}

export function SimplePaymentQRDisplay({ 
  paymentData, 
  className = ''
}: PaymentQRDisplayProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // Hydration エラーを防ぐためのマウント状態管理
  useEffect(() => {
    setMounted(true)
  }, [])

  // シンプルなSymbol URIを生成
  const generateSimpleUri = useCallback(() => {
    const amountInMicroXym = typeof paymentData.amount === 'string' 
      ? parseFloat(paymentData.amount) 
      : paymentData.amount
    
    // Symbol の標準URI形式
    return `web+symbol://transaction?data=${JSON.stringify({
      type: 'transfer',
      recipientAddress: paymentData.recipientAddress,
      amount: amountInMicroXym,
      message: paymentData.paymentId
    })}`
  }, [paymentData.amount, paymentData.recipientAddress, paymentData.paymentId])

  // QRコード生成
  useEffect(() => {
    if (!mounted) return

    const generateQR = async () => {
      try {
        setLoading(true)
        setError('')
        
        const uri = generateSimpleUri()
        const qrDataUrl = await QRCode.toDataURL(uri, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        
        setQrCodeUrl(qrDataUrl)
      } catch (err) {
        console.error('QRコード生成エラー:', err)
        setError('QRコードの生成に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    generateQR()
  }, [mounted, generateSimpleUri])

  const copyUri = async () => {
    const uri = generateSimpleUri()
    try {
      await navigator.clipboard.writeText(uri)
      setCopySuccess(true)
      console.log('URIをコピーしました')
      
      setTimeout(() => {
        setCopySuccess(false)
      }, 2000)
    } catch (err) {
      console.error('コピーに失敗:', err)
    }
  }

  const openInWallet = () => {
    const uri = generateSimpleUri()
    window.open(uri, '_blank')
  }

  // マウント前はローディング表示（Hydration エラー回避）
  if (!mounted) {
    return (
      <div className={`space-y-6 ${className}`} suppressHydrationWarning>
        <div className="border rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">QRコード</h3>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse space-y-4">
              <div className="h-64 w-64 bg-gray-200 rounded-lg mx-auto"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} suppressHydrationWarning>
      {/* QRコード表示セクション */}
      <div className="border rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">QRコード</h3>
        
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
            </div>
          </div>
        )}

        {qrCodeUrl && !loading && !error && (
          <div className="space-y-4">
            {/* QRコード画像 */}
            <div className="flex justify-center">
              <Image
                src={qrCodeUrl}
                alt="決済用QRコード"
                width={256}
                height={256}
                className="border border-gray-200 rounded-lg"
              />
            </div>

            {/* 決済情報表示 */}
            <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">決済ID:</span>
                <span className="font-mono">{paymentData.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">金額:</span>
                <span>{Number((Number(paymentData.amount) / 1000000).toFixed(6)).toString()} XYM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">送金先:</span>
                <span className="font-mono text-xs break-all">{paymentData.recipientAddress}</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={copyUri}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-md transition-all duration-200 ${
                  copySuccess 
                    ? 'border-green-300 bg-green-50 text-green-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {copySuccess ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>コピー完了！</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>URIをコピー</span>
                  </>
                )}
              </button>

              <button
                onClick={openInWallet}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>ウォレットで開く</span>
              </button>
            </div>

            {/* 使用方法の説明 */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">決済方法</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>1. Symbol ウォレットアプリを開いてください</p>
                <p>2. QRコードをスキャンするか、「ウォレットで開く」ボタンをタップしてください</p>
                <p>3. 決済内容を確認して送金を実行してください</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
