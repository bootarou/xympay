"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/home")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Main Content */}
          <div className="max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Start <span className="text-blue-600">XYM payments</span><br/>
              with <span className="text-blue-600">0% fees</span> & no<br/>
              <span className="text-blue-600">third parties</span>.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              XYMPAY Server is an open-source, self-hosted cryptocurrency payment processing solution. It&apos;s secure, private, censorship-resistant and free.
            </p>            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/auth/signin"
                className="inline-flex justify-center items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Login
              </a>
              <a
                href="/products" 
                className="inline-flex justify-center items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                商品を見る
              </a>
            </div>
            
            {/* Demo Links */}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/demo/plugins"
                className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔌 プラグインデモ
              </a>
              <a
                href="/auth/signup"
                className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                💖 寄付
              </a>
            </div>
          </div>

          {/* Right Side - Logo */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full">
              <div className="text-center">
                <div className="mb-8">
                  {/* XymPay Logo */}
                  <svg className="mx-auto h-24 w-auto" viewBox="0 0 200 80" fill="none">
                    <path d="M20 20 L50 60 L80 20" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M80 20 L50 60 L80 60" stroke="#EC4899" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                    <text x="100" y="35" className="fill-blue-600 text-2xl font-bold">XYM</text>
                    <text x="100" y="60" className="fill-orange-500 text-2xl font-bold">Pay</text>
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  Open-source cryptocurrency payment system
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="text-blue-600 font-bold text-lg mb-2">
              01 Launch your server on cloud or hosting
            </div>
            <p className="text-gray-600">
              Deploy your server on your preferred hosting or cloud environment.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="text-blue-600 font-bold text-lg mb-2">
              02 Payment fees are free
            </div>
            <p className="text-gray-600">
              No fees charged at all. All payments are processed completely free.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="text-blue-600 font-bold text-lg mb-2">
              03 Funds go directly to your wallet
            </div>
            <p className="text-gray-600">
              Received funds are transferred directly to your wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
