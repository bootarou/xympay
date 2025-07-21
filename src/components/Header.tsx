"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

/**
 * アプリケーション共通ヘッダーコンポーネント
 * 
 * @param title - ページタイトル（デフォルト: "Dashboard"）
 * @param showNavigation - ナビゲーションリンクの表示制御（デフォルト: false）
 * @param className - 追加のCSSクラス（デフォルト: ""）
 */
export interface HeaderProps {
  title?: string
  showNavigation?: boolean
  className?: string
}

export default function Header({ 
  title = "Dashboard", 
  showNavigation = false, 
  className = "" 
}: HeaderProps) {
  const { data: session } = useSession()

  return (
    <nav className={`bg-white shadow ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between h-auto sm:h-16 py-2 sm:py-0">          <div className="flex items-center mb-2 sm:mb-0">
            <Link href="/dashboard">
              <img
                className="h-8 w-auto mr-3 cursor-pointer"
                src="/image/logo-1.png"
                alt="XymPay Logo"
              />
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">            {showNavigation && (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* <Link
                  href="/products"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium text-center transition-colors"
                >
                  商品一覧
                </Link> */}
                {/* <Link
                  href="/products/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                >
                  商品登録
                </Link> */}
                {/* <Link
                  href="/profile/edit"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                >
                  プロフィール編集
                </Link> */}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-700 text-sm hidden sm:block">
                こんにちは、{session?.user?.name || session?.user?.email}さん
              </span>
              <span className="text-gray-700 text-sm sm:hidden">
                {session?.user?.name || session?.user?.email}
              </span>              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                aria-label="サインアウト"
              >
                サインアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
