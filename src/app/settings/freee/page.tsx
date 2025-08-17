"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Layout } from "../../../components"
import { useTranslation } from "../../../lib/i18n"

interface FreeeSettings {
  freeeClientId?: string | null
  freeeClientSecret?: string | null
  freeeRedirectUri?: string | null
}

export default function FreeeSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const [isMounted, setIsMounted] = useState(false)
  const [settings, setSettings] = useState<FreeeSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status, router, isMounted])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/user/freee-settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setError("設定の取得に失敗しました")
      }
    } catch (error) {
      setError("設定の取得中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/user/freee-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setSuccess("freee設定を保存しました")
      } else {
        const errorData = await response.json()
        setError(errorData.message || "設定の保存に失敗しました")
      }
    } catch (error) {
      setError("設定の保存中にエラーが発生しました")
    } finally {
      setIsSaving(false)
    }
  }

  const generateRedirectUri = () => {
    const baseUrl = window.location.origin
    const redirectUri = `${baseUrl}/api/accounting/oauth/callback`
    setSettings(prev => ({ ...prev, freeeRedirectUri: redirectUri }))
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <Layout title="freee連携設定">
      <div className="py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">freee連携設定</h1>
            <p className="mt-2 text-gray-600">
              freee会計ソフトとの連携に必要なOAuth設定を管理します。
            </p>
          </div>

          {/* 設定手順の説明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">🔧 freee OAuth設定手順</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>
                <a 
                  href="https://developer.freee.co.jp/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  freee developers サイト
                </a>
                にアクセスしてアカウントを作成
              </li>
              <li>「アプリ管理」→「新しいアプリを作成」をクリック</li>
              <li>アプリ情報を入力（アプリタイプ: Webアプリケーション）</li>
              <li>下記の「リダイレクトURI生成」ボタンでURIを生成し、freeeに登録</li>
              <li>取得したClient IDとClient Secretを下記フォームに入力</li>
            </ol>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* エラー・成功メッセージ */}
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

            {/* Client ID */}
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                freee Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="clientId"
                value={settings.freeeClientId || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, freeeClientId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="freee開発者コンソールで取得したClient IDを入力"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                freee開発者コンソールで取得したOAuth Client IDを入力してください
              </p>
            </div>

            {/* Client Secret */}
            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
                freee Client Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="clientSecret"
                value={settings.freeeClientSecret || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, freeeClientSecret: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="freee開発者コンソールで取得したClient Secretを入力"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                freee開発者コンソールで取得したOAuth Client Secretを入力してください
              </p>
            </div>

            {/* Redirect URI */}
            <div>
              <label htmlFor="redirectUri" className="block text-sm font-medium text-gray-700 mb-2">
                リダイレクトURI <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  id="redirectUri"
                  value={settings.freeeRedirectUri || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, freeeRedirectUri: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://yourdomain.com/api/accounting/oauth/callback"
                  required
                />
                <button
                  type="button"
                  onClick={generateRedirectUri}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
                >
                  自動生成
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                freeeアプリ設定に登録するリダイレクトURIです。「自動生成」ボタンで現在のドメインベースのURIを生成できます
              </p>
            </div>

            {/* 保存ボタン */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isSaving ? "保存中..." : "設定を保存"}
              </button>
            </div>
          </form>

          {/* 連携テスト */}
          {settings.freeeClientId && settings.freeeClientSecret && settings.freeeRedirectUri && (
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 連携テスト</h3>
              <p className="text-sm text-gray-600 mb-4">
                設定が完了したら、会計設定ページでfreee連携をテストできます。
              </p>
              <a
                href="/accounting"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                会計設定ページへ
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
