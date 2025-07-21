"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Layout } from "../../components"
import { useTranslation } from "../../lib/i18n"
import { useDashboardStats, formatAmount } from "../../hooks/useDashboardStats"

// SalesChartを動的インポート（Chart.jsの問題を回避）
const SalesChart = dynamic(
  () => import("../../components/SalesChart"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">売上推移</h3>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    ),
  }
)

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const { stats, loading: statsLoading, error: statsError, refetch } = useDashboardStats()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
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
    <Layout title={t("navigation.home")}>
      <div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ウェルカムセクション */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            {t("home.welcome")}, {session?.user?.name || session?.user?.email?.split('@')[0]}！
          </h2>
          <p className="text-blue-100">
            {t("home.description")}
          </p>
        </div>        {/* クイックアクション */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("home.quickActions")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t("products.addProduct")}</h3>
                  <p className="text-gray-600 text-sm">商品を追加して販売を開始</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/products/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  登録する
                </a>
              </div>
            </div>            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">商品を管理</h3>
                  <p className="text-gray-600 text-sm">既存の商品を確認・編集</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/products"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  管理する
                </a>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">プロフィール設定</h3>
                  <p className="text-gray-600 text-sm">個人情報を更新</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/profile/edit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  設定する
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">概要</h3>
            {statsError && (
              <button
                onClick={refetch}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                再読み込み
              </button>
            )}
          </div>
          
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : statsError ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{statsError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.productCount.toLocaleString()}
                </div>
                <div className="text-gray-600">登録商品数</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.monthlyRevenue >= 1000000 ? 
                    `${formatAmount(stats.monthlyRevenue)} XYM` : 
                    `${stats.monthlyRevenue.toLocaleString()} μXYM`
                  }
                </div>
                <div className="text-gray-600">今月の売上</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {stats.totalTransactions.toLocaleString()}
                </div>
                <div className="text-gray-600">総取引数</div>
              </div>
            </div>
          )}
        </div>

        {/* 売上推移グラフ */}
        <SalesChart className="mt-8" />

        {/* お知らせ */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">お知らせ</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">
                    XymPayプラットフォームへようこそ！商品登録から始めましょう。
                  </p>
                  <p className="text-xs text-gray-400 mt-1">今日</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">
                    新機能：カスタムフォーム項目が利用可能になりました。
                  </p>
                  <p className="text-xs text-gray-400 mt-1">昨日</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  )
}
