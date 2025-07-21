"use client"

import { Layout } from "../../../components"
import { CurrencySettingsComponent } from "../../../components/CurrencySettings"

export default function CurrencySettingsPage() {
  return (
    <Layout title="通貨設定">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">通貨・為替レート設定</h1>
          <p className="mt-2 text-gray-600">
            課税売上対応のための通貨単位選択と為替レート取得APIの設定を管理します。
          </p>
        </div>

        {/* メイン設定エリア */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <CurrencySettingsComponent />
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">重要な注意事項</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 基準通貨の変更は既存の決済データには影響しません。</li>
            <li>• 決済時に保存された為替レートは後から変更できません。</li>
            <li>• 為替レートプロバイダーによってはAPI利用制限があります。</li>
            <li>• 課税売上の計算は保存された決済時のレートを使用します。</li>
          </ul>
        </div>

        {/* プロセス説明 */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">レート保存プロセス</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-2">
                1
              </div>
              <h4 className="font-medium text-gray-900">決済開始</h4>
              <p className="text-sm text-gray-600 mt-1">
                購入者が決済を開始した時点
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-2">
                2
              </div>
              <h4 className="font-medium text-gray-900">レート取得</h4>
              <p className="text-sm text-gray-600 mt-1">
                設定されたプロバイダーから最新レートを取得
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-2">
                3
              </div>
              <h4 className="font-medium text-gray-900">レート保存</h4>
              <p className="text-sm text-gray-600 mt-1">
                決済確定時に基準通貨額とレートを保存
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
