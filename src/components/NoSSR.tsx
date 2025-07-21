import dynamic from 'next/dynamic'
import { ComponentType, ReactNode } from 'react'

interface NoSSRWrapperProps {
  children: ReactNode
}

// ハイドレーションエラーを完全に回避するためのラッパー
function NoSSRWrapper({ children }: NoSSRWrapperProps) {
  return <>{children}</>
}

// SSRを完全に無効にするラッパー
export const NoSSR = dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false
})

// 安全なコンポーネントラッパー
export function withNoSSR<T extends object>(
  Component: ComponentType<T>,
  loadingComponent?: () => ReactNode
): ComponentType<T> {
  const SafeComponent = dynamic(() => Promise.resolve(Component), {
    ssr: false,
    loading: loadingComponent || (() => (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ))
  })

  SafeComponent.displayName = `NoSSR(${Component.displayName || Component.name})`
  
  return SafeComponent
}

// 特定のコンポーネント用のNoSSRバージョン
export const NoSSRSimplePaymentQRDisplay = withNoSSR(
  dynamic(() => import('../components/SimplePaymentQRDisplay').then(mod => mod.SimplePaymentQRDisplay), {
    ssr: false
  })
)

export const NoSSRExchangeRateDisplay = withNoSSR(
  dynamic(() => import('../components/ExchangeRateDisplay').then(mod => mod.ExchangeRateDisplay), {
    ssr: false
  })
)
