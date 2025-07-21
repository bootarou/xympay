import React, { useState, useEffect } from 'react'
import { qrPluginManager } from '../lib/symbol/plugins'

interface WalletCardProps {
  wallet: {
    id: string
    name: string
    displayName: string
    description: string
    icon: string
    type: 'mobile' | 'desktop' | 'web' | 'hardware'
    supported: boolean
    downloadUrl?: string
  }
  pluginId: string
  isSelected: boolean
  onSelect: (pluginId: string) => void
  disabled?: boolean
}

function WalletCard({ wallet, pluginId, isSelected, onSelect, disabled = false }: WalletCardProps) {
  const getWalletTypeIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return '📱'
      case 'desktop':
        return '🖥️'
      case 'web':
        return '🌐'
      case 'hardware':
        return '🔒'
      default:
        return '💼'
    }
  }

  const getWalletTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile':
        return 'モバイル'
      case 'desktop':
        return 'デスクトップ'
      case 'web':
        return 'ウェブ'
      case 'hardware':
        return 'ハードウェア'
      default:
        return '不明'
    }
  }

  return (
    <div
      className={`
        relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onSelect(pluginId)}
    >
      {/* 選択状態インジケーター */}
      {isSelected && (
        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className="flex items-start space-x-3">
        {/* ウォレットアイコン */}
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
          {wallet.icon.startsWith('/') ? (
            <img src={wallet.icon} alt={wallet.name} className="h-8 w-8" />
          ) : (
            <span className="text-2xl">{getWalletTypeIcon(wallet.type)}</span>
          )}
        </div>

        {/* ウォレット情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {wallet.displayName}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {getWalletTypeLabel(wallet.type)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {wallet.description}
          </p>
          
          {/* ダウンロードリンク */}
          {wallet.downloadUrl && !wallet.supported && (
            <a
              href={wallet.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
              onClick={(e) => e.stopPropagation()}
            >
              ダウンロード →
            </a>
          )}
        </div>
      </div>

      {/* サポート状況 */}
      <div className="mt-2 flex items-center space-x-2">
        <div className={`h-2 w-2 rounded-full ${wallet.supported ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <span className="text-xs text-gray-600">
          {wallet.supported ? '利用可能' : 'ウォレットをインストールしてください'}
        </span>
      </div>
    </div>
  )
}

interface WalletSelectorProps {
  selectedWalletId?: string
  onWalletSelect: (walletId: string) => void
  className?: string
}

export function WalletSelector({ selectedWalletId, onWalletSelect, className = '' }: WalletSelectorProps) {
  const [availableWallets, setAvailableWallets] = useState<Array<{ pluginId: string; wallet: any }>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const loadWallets = async () => {
      try {
        setLoading(true)
        const wallets = qrPluginManager.getAvailableWallets()
        setAvailableWallets(wallets)
      } catch (error) {
        console.error('ウォレット一覧の取得に失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    // 初期読み込み
    loadWallets()

    // プラグイン設定変更の監視
    qrPluginManager.addEventListener(loadWallets)

    return () => {
      qrPluginManager.removeEventListener(loadWallets)
    }
  }, [])

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900">ウォレットを選択</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-12 w-12 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">ウォレットを選択</h3>
        <div className="text-sm text-gray-500">
          {availableWallets.length}個のウォレットが利用可能
        </div>
      </div>
        {availableWallets.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">💼</div>
          <p className="text-gray-500 mb-4">利用可能なウォレットがありません</p>
          <p className="text-sm text-gray-400 mb-4">プラグイン管理画面でウォレットプラグインを有効化してください</p>
          <a
            href="/admin/plugins"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            プラグイン管理画面を開く
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableWallets.map(({ pluginId, wallet }) => (
            <WalletCard
              key={pluginId}
              wallet={wallet}
              pluginId={pluginId}
              isSelected={selectedWalletId === pluginId}
              onSelect={onWalletSelect}
            />
          ))}
        </div>
      )}
      
      {selectedWalletId && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              {availableWallets.find(w => w.pluginId === selectedWalletId)?.wallet.displayName} を選択中
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
