'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function SimpleSessionPaymentPage() {
  const params = useParams()
  const sessionKey = params.sessionKey as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            決済セッション
          </h1>
          <div className="space-y-4">
            <div>
              <span className="text-gray-600">セッションキー:</span>
              <span className="ml-2 font-mono text-sm">{sessionKey}</span>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ページが正常に読み込まれました！チャンクローディングエラーは解決されています。
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                現在、QRコード表示機能は一時的に無効になっています。
                この簡易版でページが読み込めることを確認後、段階的に機能を復旧します。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
