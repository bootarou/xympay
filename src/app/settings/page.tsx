"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Layout } from "../../components"
import { useTranslation } from "../../lib/i18n"
import { useSettings } from "../../hooks/useSettings"

export default function Settings() {
  const { status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const { 
    settings, 
    isLoaded, 
    isLoading,
    updateAutoPaymentMonitoring, 
    updateNotifications, 
    updateEmailNotifications 
  } = useSettings()
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [isTestingNotification, setIsTestingNotification] = useState(false)
  const [notificationTestMessage, setNotificationTestMessage] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // 設定保存関数
  const saveSettings = async () => {
    setIsSaving(true)
    setSaveMessage("")

    try {
      setSaveMessage("設定が正常に保存されました")
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error) {
      console.error("設定保存エラー:", error)
      setSaveMessage("設定の保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  // 通知テスト関数
  const testNotification = async () => {
    setIsTestingNotification(true)
    setNotificationTestMessage("")

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'test' }),
      })

      const data = await response.json()

      if (data.success) {
        setNotificationTestMessage("✅ テスト通知を送信しました。メールボックスをご確認ください。")
      } else {
        setNotificationTestMessage(`⚠️ ${data.message || 'テスト通知の送信に失敗しました'}`)
      }

      setTimeout(() => setNotificationTestMessage(""), 10000)
    } catch (error) {
      console.error("通知テストエラー:", error)
      setNotificationTestMessage("❌ 通知テストでエラーが発生しました")
      setTimeout(() => setNotificationTestMessage(""), 5000)
    } finally {
      setIsTestingNotification(false)
    }
  }
  if (status === "loading" || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t("common.loading")}</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }
  return (
    <Layout title={t("settings.title")}>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
            {t("settings.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            アカウント設定と通知設定を管理します
          </p>
        </div>

        <div className="space-y-8">
          {/* 決済設定 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                決済設定
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">自動決済確認</h4>
                    <p className="text-sm text-gray-500">取引の自動確認を有効にします</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !settings.autoPaymentMonitoring
                      updateAutoPaymentMonitoring(newValue)
                    }}
                    className={`${
                      settings.autoPaymentMonitoring ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.autoPaymentMonitoring ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      デフォルト支払い先アドレス
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Symbol アドレスを入力"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      新しい商品のデフォルト支払い先として使用されます
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* freee連携設定 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                freee連携設定
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    freee会計ソフトとの連携に必要なOAuth認証情報を設定します。
                  </p>
                  <div className="flex items-center space-x-4">
                    <a
                      href="/settings/freee"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      freee連携を設定
                    </a>
                    <a
                      href="/accounting"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      会計設定を確認
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 通知設定 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                通知設定
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">プッシュ通知</h4>
                    <p className="text-sm text-gray-500">新しい取引の通知を受け取ります</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !settings.notifications
                      updateNotifications(newValue)
                    }}
                    className={`${
                      settings.notifications ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.notifications ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">メール通知</h4>
                    <p className="text-sm text-gray-500">重要な更新をメールで受け取ります</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !settings.emailNotifications
                      updateEmailNotifications(newValue)
                    }}
                    className={`${
                      settings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                {/* 通知テスト */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">通知テスト</h4>
                      <p className="text-sm text-gray-500">メール通知機能をテストします</p>
                    </div>
                    <button
                      onClick={testNotification}
                      disabled={isTestingNotification || !settings.emailNotifications}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isTestingNotification ? '送信中...' : 'テスト送信'}
                    </button>
                  </div>
                  {notificationTestMessage && (
                    <div className="mt-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md p-2">
                      {notificationTestMessage}
                    </div>
                  )}
                  {!settings.emailNotifications && (
                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                      メール通知を有効にしてからテストしてください
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* アカウント設定 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                アカウント設定
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    表示言語
                  </label>
                  <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option>日本語</option>
                    <option>English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    タイムゾーン
                  </label>
                  <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option>Asia/Tokyo (GMT+9)</option>
                    <option>UTC (GMT+0)</option>
                    <option>America/New_York (GMT-5)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* セキュリティ */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                セキュリティ
              </h3>
              <div className="space-y-4">
                <div>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    パスワードを変更
                  </button>
                  <p className="mt-1 text-sm text-gray-500">
                    定期的なパスワード変更をお勧めします
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 text-red-600">危険な操作</h4>
                  <div className="mt-2">
                    <button className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                      アカウントを削除
                    </button>
                    <p className="mt-1 text-sm text-gray-500">
                      アカウントとすべてのデータが完全に削除されます
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <div className="flex items-center space-x-3">
              {saveMessage && (
                <span 
                  className={`text-sm ${
                    saveMessage.includes("失敗") ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {saveMessage}
                </span>
              )}
              <button 
                onClick={saveSettings}
                disabled={isSaving}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isSaving 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {isSaving ? "保存中..." : "設定を保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
