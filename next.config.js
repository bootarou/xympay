/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: []
  },
  // Hydrationエラー抑制（開発環境のみ）
  reactStrictMode: false,
  // ブラウザ拡張機能によるハイドレーションエラーを抑制
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig
