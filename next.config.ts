import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Chart.jsのCanvas依存関係を適切に処理
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    return config;
  },
  experimental: {
    // パフォーマンス改善のための設定
    optimizePackageImports: ['chart.js', 'react-chartjs-2'],
  },
}

export default nextConfig;
