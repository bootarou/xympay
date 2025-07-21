import dynamic from 'next/dynamic'
import { ComponentType, createElement } from 'react'

// ハイドレーションエラーを防ぐためのコンポーネントラッパー
export function withHydrationSafety<T extends object>(
  Component: ComponentType<T>,
  fallback: ComponentType<T> | null = null
): ComponentType<T> {
  const SafeComponent = dynamic(() => Promise.resolve(Component), {
    ssr: false,
    loading: () => fallback ? createElement(fallback, {} as T) : (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  })

  SafeComponent.displayName = `HydrationSafe(${Component.displayName || Component.name})`
  
  return SafeComponent
}

// 特定のコンポーネント用のセーフバージョン
export const SafeExchangeRateDisplay = withHydrationSafety(
  dynamic(() => import('./ExchangeRateDisplay').then(mod => ({ default: mod.ExchangeRateDisplay })), {
    ssr: false
  })
)

export const SafeSimplePaymentQRDisplay = withHydrationSafety(
  dynamic(() => import('./SimplePaymentQRDisplay').then(mod => ({ default: mod.SimplePaymentQRDisplay })), {
    ssr: false
  })
)
