'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WalletSelector } from '../../../components/WalletSelector'
import { PaymentQRDisplay } from '../../../components/PaymentQRDisplay'

export default function PluginDemoPage() {
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  
  // デモ用の決済データ
  const demoPaymentData = {
    paymentId: 'DEMO1234',
    productId: 'demo-product',
    recipientAddress: 'TBONKIFKFBZQB6SY7FHXGQ7MZJ6JVBKDPVHLLHJH',
    amount: 100,
    message: 'DEMO1234',
    expireAt: new Date(Date.now() + 5 * 60 * 1000) // 5分後
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔌 QRプラグインシステム デモ
          </h1>
          <p className="text-gray-600">
            ウォレット選択UIとプラグインベースのQRコード生成機能をテストできます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ウォレット選択エリア */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <WalletSelector
              selectedWalletId={selectedWalletId}
              onWalletSelect={setSelectedWalletId}
            />
          </div>

          {/* QRコード表示エリア */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              QRコード生成結果
            </h2>
            
            {selectedWalletId ? (
              <PaymentQRDisplay
                paymentData={demoPaymentData}
                onWalletChange={setSelectedWalletId}
                defaultWalletId={selectedWalletId}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📱</div>
                <p className="text-gray-500">
                  ウォレットを選択するとQRコードが表示されます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* デモ情報 */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">デモ決済情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">決済ID:</span>
                <span className="font-mono text-blue-900">{demoPaymentData.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">金額:</span>
                <span className="font-medium text-blue-900">{demoPaymentData.amount} XYM</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">送金先:</span>
                <span className="font-mono text-xs text-blue-900">
                  {demoPaymentData.recipientAddress.slice(0, 20)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">メッセージ:</span>
                <span className="font-mono text-blue-900">{demoPaymentData.message}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 機能説明 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            🚀 実装された機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">ウォレット選択UI</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• カード型の直感的なUI</li>
                <li>• ウォレット種別の視覚的表示</li>
                <li>• 利用可能性ステータス</li>
                <li>• ダウンロードリンク</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">QRコード生成</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• プラグインベースの生成</li>
                <li>• ウォレット固有の最適化</li>
                <li>• リアルタイム切り替え</li>
                <li>• URIコピー・起動機能</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
