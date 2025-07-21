import React, { useState, useEffect } from 'react'
import { WalletSelector } from './WalletSelector'
import { generateQRCodeForWallet } from '../lib/symbol/qr-generator'
import { qrPluginManager } from '../lib/symbol/plugins'
import { PaymentData } from '../lib/symbol/payment'

interface PaymentQRDisplayProps {
  paymentData: PaymentData | {
    recipientAddress: string
    amount: number | string
    paymentId: string
  }
  className?: string
  onWalletChange?: (walletId: string) => void
  defaultWalletId?: string
}

export function PaymentQRDisplay({ 
  paymentData, 
  className = '',
  onWalletChange,
  defaultWalletId
}: PaymentQRDisplayProps) {
  const [selectedWalletId, setSelectedWalletId] = useState<string>(defaultWalletId || '')
  const [qrData, setQrData] = useState<{
    qrCode: string
    uri: string
    wallet: any
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydration エラーを防ぐためのマウント状態管理
  useEffect(() => {
    setMounted(true)
  }, [])  // 初期ウォレット設定と設定変更の監視
  useEffect(() => {
    if (!mounted) return

    const updateAvailableWallets = () => {
      const availableWallets = qrPluginManager.getAvailableWallets()
      
      // デバッグ情報を出力
      console.log('PaymentQRDisplay: updateAvailableWallets called');
      qrPluginManager.debugConfig();
      
      // 有効なプラグインがない場合
      if (availableWallets.length === 0) {
        setSelectedWalletId('')
        setQrData(null)
        setError('利用可能なウォレットプラグインがありません。管理画面でプラグインを有効化してください。')
        return
      }

      // 現在選択中のウォレットが無効になった場合
      if (selectedWalletId && !availableWallets.some(w => w.pluginId === selectedWalletId)) {
        const config = qrPluginManager.getConfig()
        const defaultWallet = config.defaultWalletId && availableWallets.some(w => w.pluginId === config.defaultWalletId)
          ? config.defaultWalletId
          : availableWallets[0].pluginId
        setSelectedWalletId(defaultWallet)
        return
      }

      // 初期設定
      if (!selectedWalletId) {
        const config = qrPluginManager.getConfig()
        const defaultWallet = config.defaultWalletId && availableWallets.some(w => w.pluginId === config.defaultWalletId)
          ? config.defaultWalletId
          : availableWallets[0].pluginId
        setSelectedWalletId(defaultWallet)
      }
    }

    // 初期実行
    updateAvailableWallets()

    // プラグイン設定変更の監視
    qrPluginManager.addEventListener(updateAvailableWallets)

    return () => {
      qrPluginManager.removeEventListener(updateAvailableWallets)
    }
  }, [mounted, selectedWalletId])
  // QRコード生成
  useEffect(() => {
    if (!mounted) return
    
    if (selectedWalletId && paymentData) {
      generateQR()
    } else if (!selectedWalletId) {
      setQrData(null)
      const availableWallets = qrPluginManager.getAvailableWallets()
      if (availableWallets.length === 0) {
        setError('利用可能なウォレットプラグインがありません。管理画面でプラグインを有効化してください。')
      }
    }
  }, [mounted, selectedWalletId, paymentData])

  const generateQR = async () => {
    if (!selectedWalletId) {
      setError('ウォレットが選択されていません')
      return
    }

    // 選択されたウォレットが有効かチェック
    const availableWallets = qrPluginManager.getAvailableWallets()
    if (!availableWallets.some(w => w.pluginId === selectedWalletId)) {
      setError('選択されたウォレットプラグインが無効です')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let result;
      // PaymentDataの完全な型の場合
      if ('productId' in paymentData && 'message' in paymentData && 'expireAt' in paymentData) {
        result = await generateQRCodeForWallet(paymentData as PaymentData, selectedWalletId);
      } else {
        // 簡易PaymentDataの場合、完全なPaymentDataに変換
        const fullPaymentData: PaymentData = {
          paymentId: paymentData.paymentId,
          productId: 'unknown', // デフォルト値
          recipientAddress: paymentData.recipientAddress,
          amount: typeof paymentData.amount === 'string' ? parseFloat(paymentData.amount) : paymentData.amount,
          message: paymentData.paymentId,
          expireAt: new Date(Date.now() + 5 * 60 * 1000) // 5分後
        };
        result = await generateQRCodeForWallet(fullPaymentData, selectedWalletId);
      }
      setQrData(result)
    } catch (err) {
      console.error('QRコード生成エラー:', err)
      setError(err.message || 'QRコードの生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleWalletSelect = (walletId: string) => {
    setSelectedWalletId(walletId)
    setShowWalletSelector(false)
    onWalletChange?.(walletId)
  }

  const copyUri = async () => {
    if (qrData?.uri) {
      try {
        await navigator.clipboard.writeText(qrData.uri)
        setCopySuccess(true)
        console.log('URIをコピーしました')
        
        // 2秒後にコピー成功状態をリセット
        setTimeout(() => {
          setCopySuccess(false)
        }, 2000)
      } catch (err) {
        console.error('コピーに失敗:', err)
      }
    }
  }

  const openInWallet = () => {
    if (qrData?.uri) {
      window.open(qrData.uri, '_blank')
    }
  }

  // マウント前はローディング表示
  if (!mounted) {
    return (
      <div className={`space-y-6 ${className}`} suppressHydrationWarning>
        <div className="border rounded-lg p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded mx-auto w-64"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} suppressHydrationWarning>
      {/* ウォレット選択セクション */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">決済ウォレット</h3>
          <button
            onClick={() => setShowWalletSelector(!showWalletSelector)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {showWalletSelector ? '閉じる' : '変更'}
          </button>
        </div>        {/* 選択中のウォレット表示 */}
        {qrData?.wallet && !showWalletSelector && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
              {qrData.wallet.icon.startsWith('/') ? (
                <img src={qrData.wallet.icon} alt={qrData.wallet.name} className="h-6 w-6" />
              ) : (
                <span className="text-lg">📱</span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{qrData.wallet.displayName}</div>
              <div className="text-sm text-gray-500">{qrData.wallet.description}</div>
            </div>
          </div>
        )}

        {/* プラグインが無効の場合の警告 */}
        {!selectedWalletId && !showWalletSelector && (
          <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <div className="font-medium text-red-900">ウォレットが選択されていません</div>
              <div className="text-sm text-red-700">プラグイン管理画面でウォレットプラグインを有効化してください</div>
            </div>
          </div>
        )}

        {/* ウォレット選択UI */}
        {showWalletSelector && (
          <WalletSelector
            selectedWalletId={selectedWalletId}
            onWalletSelect={handleWalletSelect}
          />
        )}
      </div>

      {/* QRコード表示セクション */}
      <div className="border rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">QRコード</h3>
        
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-x-2">
                {selectedWalletId ? (
                  <button
                    onClick={generateQR}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    再試行
                  </button>
                ) : (
                  <>
                    <a
                      href="/admin/plugins"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      プラグイン管理画面を開く
                    </a>
                    <button
                      onClick={() => {
                        const availableWallets = qrPluginManager.getAvailableWallets()
                        if (availableWallets.length > 0) {
                          const config = qrPluginManager.getConfig()
                          const defaultWallet = config.defaultWalletId && availableWallets.some(w => w.pluginId === config.defaultWalletId)
                            ? config.defaultWalletId
                            : availableWallets[0].pluginId
                          setSelectedWalletId(defaultWallet)
                          setError(null)
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      再読み込み
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {qrData && !loading && !error && (
          <div className="space-y-4">
            {/* QRコード画像 */}
            <div className="flex justify-center">
              <img
                src={qrData.qrCode}
                alt="決済用QRコード"
                className="border border-gray-200 rounded-lg"
              />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>ウォレットで開く</span>
              </button>
            </div>

            {/* 決済情報 */}
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
                <span className="font-mono text-xs">{paymentData.recipientAddress}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 使用方法 */}
      {qrData?.wallet && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-2">決済方法</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. {qrData.wallet.displayName}アプリを開いてください</p>
            <p>2. QRコードをスキャンするか、「ウォレットで開く」ボタンをタップしてください</p>
            <p>3. 決済内容を確認して送金を実行してください</p>
          </div>
          {qrData.wallet.downloadUrl && (
            <div className="mt-3">
              <a
                href={qrData.wallet.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {qrData.wallet.displayName}をダウンロード →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
