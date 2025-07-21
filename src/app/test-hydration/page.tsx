'use client'

import dynamic from 'next/dynamic'

// クライアントサイドでのみレンダリングするコンポーネント
const SimplePaymentQRDisplay = dynamic(
  () => import('../../components/SimplePaymentQRDisplay').then(mod => ({ default: mod.SimplePaymentQRDisplay })),
  { 
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="border rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">QRコード読み込み中...</h3>
          <div className="animate-pulse bg-gray-200 h-64 w-64 rounded-lg mx-auto"></div>
        </div>
      </div>
    )
  }
)

const ExchangeRateDisplay = dynamic(
  () => import('../../components/ExchangeRateDisplay').then(mod => ({ default: mod.ExchangeRateDisplay })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="text-sm text-gray-500">為替レート読み込み中...</div>
        </div>
      </div>
    )
  }
)

export default function HydrationTestPage() {
  // テスト用の決済データ
  const testPaymentData = {
    paymentId: 'test-hydration',
    recipientAddress: 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY',
    amount: 1000 // 0.001 XYM in microXYM
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Hydration テストページ
        </h1>
        
        <div className="space-y-8">
          {/* ExchangeRateDisplay のテスト */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">ExchangeRateDisplay</h2>
            <div suppressHydrationWarning>
              <ExchangeRateDisplay
                amount={testPaymentData.amount}
                fromCurrency="XYM"
                toCurrency="JPY"
              />
            </div>
          </div>

          {/* SimplePaymentQRDisplay のテスト */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">SimplePaymentQRDisplay</h2>
            <div suppressHydrationWarning>
              <SimplePaymentQRDisplay
                paymentData={testPaymentData}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">テスト内容</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Hydration エラーが発生しないか</li>
            <li>• コンポーネントが正しく表示されるか</li>
            <li>• dynamic import が正常に動作するか</li>
            <li>• ローディング状態が適切に表示されるか</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
