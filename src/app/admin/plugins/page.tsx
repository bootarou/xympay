"use client"

import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Layout } from "../../../components"
import { useTranslation } from "../../../lib/i18n"
import { qrPluginManager } from '../../../lib/symbol/plugins'
import type { QRGeneratorPlugin, PluginManagerConfig } from '../../../lib/symbol/plugins/types'

// QRコードモーダルコンポーネント
interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  qrData: string
  title: string
}

function QRModal({ isOpen, onClose, qrData, title }: QRModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  const downloadQR = () => {
    try {
      if (!qrData || !qrData.startsWith('data:image/')) {
        alert('QRコードデータが無効のため、ダウンロードできません。');
        return;
      }
      
      const link = document.createElement('a')
      link.href = qrData
      link.download = `${title.replace(/\s+/g, '_')}_QR.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('QRコードダウンロードエラー:', error);
      alert('QRコードのダウンロードに失敗しました。');
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
          <div className="text-center">
          <img 
            src={qrData} 
            alt={title}
            className="mx-auto border border-gray-200 rounded-lg shadow-sm"
            style={{ maxWidth: '300px', maxHeight: '300px' }}
            onError={(e) => {
              console.error('QRモーダル画像読み込みエラー:', { qrData: qrData.substring(0, 100), title });
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVSUk9SOiBRUuOCs+ODvOODieOBruiqreOBv+i+vOOBv+OBq+WkseaknzwvdGV4dD48L3N2Zz4=';
            }}
            onLoad={() => {
              console.log('QRモーダル画像読み込み成功:', title);
            }}
          />
          
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={downloadQR}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>ダウンロード</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              閉じる
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            📱 スマホでQRコードを読み取ってテストしてください
          </div>
        </div>
      </div>
    </div>
  )
}

interface PluginCardProps {
  plugin: QRGeneratorPlugin
  isEnabled: boolean
  isDefault: boolean
  isTesting: boolean
  onToggle: (pluginId: string, enabled: boolean) => void
  onSetDefault: (pluginId: string) => void
  onTest: (pluginId: string) => void
  onShowQRModal: (qrData: string, title: string) => void
  t?: any
}

function PluginCard({ plugin, isEnabled, isDefault, isTesting, onToggle, onSetDefault, onTest, onShowQRModal, t }: PluginCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mobile':
        return 'bg-blue-100 text-blue-800'
      case 'desktop':
        return 'bg-green-100 text-green-800'
      case 'web':
        return 'bg-purple-100 text-purple-800'
      case 'hardware':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
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

  return (
    <div className={`bg-white rounded-lg border-2 p-6 transition-all duration-200 ${
      isEnabled ? 'border-blue-200 shadow-md' : 'border-gray-200'
    }`}>
      {/* プラグインヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
            {plugin.wallet.icon.startsWith('/') ? (
              <img src={plugin.wallet.icon} alt={plugin.name} className="h-8 w-8" />
            ) : (
              <span className="text-2xl">{getTypeIcon(plugin.wallet.type)}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{plugin.wallet.displayName}</h3>
            <p className="text-sm text-gray-600">{plugin.name} v{plugin.version}</p>
          </div>
        </div>
        
        {/* 有効/無効切り替え */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(plugin.id, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* プラグイン情報 */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{plugin.description}</p>
        
        {/* ウォレット情報 */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(plugin.wallet.type)}`}>
            {getTypeIcon(plugin.wallet.type)} {plugin.wallet.type}
          </span>          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            plugin.wallet.supported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {plugin.wallet.supported ? `✅ ${t ? t("plugins.available") : "利用可能"}` : `⚠️ ${t ? t("plugins.requiresInstallation") : "要インストール"}`}
          </span>
          {isDefault && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              ⭐ {t ? t("plugins.default") : "デフォルト"}
            </span>
          )}
        </div>

        {/* ダウンロードリンク */}
        {plugin.wallet.downloadUrl && (
          <a
            href={plugin.wallet.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>            {t ? t("plugins.download") : "ダウンロード"}
          </a>
        )}
      </div>

      {/* アクションボタン */}
      {isEnabled && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {!isDefault && (
              <button
                onClick={() => onSetDefault(plugin.id)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                {t ? t("plugins.setAsDefault") : "デフォルトに設定"}
              </button>
            )}            <button
              onClick={() => onTest(plugin.id)}
              disabled={isTesting}
              className={`px-3 py-2 border text-sm rounded-md transition-colors flex items-center space-x-1 ${
                isTesting 
                  ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isTesting ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  <span>テスト実行中...</span>
                </>
              ) : (
                <>
                  <span>🧪</span>
                  <span>{t ? t("plugins.testRun") : "テスト実行"}</span>
                  <span className="text-xs text-gray-500">(QR表示)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PluginManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const [plugins, setPlugins] = useState<QRGeneratorPlugin[]>([])
  const [config, setConfig] = useState<PluginManagerConfig>({
    enabledPlugins: [],
    pluginSettings: {}
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    timestamp: number;
  }>>({})
  const [testingPlugins, setTestingPlugins] = useState<Set<string>>(new Set())
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean
    qrData: string
    title: string
  }>({
    isOpen: false,
    qrData: '',
    title: ''
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])
  useEffect(() => {
    loadPlugins()
  }, [])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      
      // 全てのプラグインを取得（有効/無効に関係なく）
      const pluginList = qrPluginManager.getAllPlugins()
      setPlugins(pluginList)
      
      // 設定取得
      const currentConfig = qrPluginManager.getConfig()
      setConfig(currentConfig)
      
      // デバッグ情報を出力
      console.log('プラグイン管理画面: loadPlugins');
      qrPluginManager.debugConfig();
      
    } catch (error) {
      console.error('プラグイン情報の取得に失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      setSaving(true)
      qrPluginManager.setPluginEnabled(pluginId, enabled)
      
      // 設定を更新
      const updatedConfig = qrPluginManager.getConfig()
      setConfig(updatedConfig)
      
      // デフォルトプラグインが無効になった場合、別のプラグインをデフォルトに設定
      if (!enabled && config.defaultWalletId === pluginId) {
        const enabledPlugins = updatedConfig.enabledPlugins
        if (enabledPlugins.length > 0) {
          qrPluginManager.setDefaultWallet(enabledPlugins[0])
          setConfig(qrPluginManager.getConfig())
        }
      }
      
    } catch (error) {
      console.error('プラグイン設定の更新に失敗:', error)
    } finally {
      setSaving(false)
    }
  }
  const handleSetDefault = async (pluginId: string) => {
    try {
      setSaving(true)
      qrPluginManager.setDefaultWallet(pluginId)
      
      // 設定を更新
      const updatedConfig = qrPluginManager.getConfig()
      setConfig(updatedConfig)
      
    } catch (error) {
      console.error('デフォルトプラグインの設定に失敗:', error)
    } finally {
      setSaving(false)
    }  }
  const handleShowQRModal = (qrData: string, title: string) => {
    console.log('QRモーダルを開く:', { qrData: qrData.substring(0, 50) + '...', title });
    
    // QRデータの妥当性をチェック
    if (!qrData || !qrData.startsWith('data:image/')) {
      console.error('無効なQRコードデータ:', qrData);
      alert('QRコードデータが無効です。プラグインの実装を確認してください。');
      return;
    }
    
    setQrModalData({
      isOpen: true,
      qrData,
      title
    })
  }

  const handleCloseQRModal = () => {
    setQrModalData({
      isOpen: false,
      qrData: '',
      title: ''
    })
  }

  const handleTestPlugin = async (pluginId: string) => {
    try {
      setTestingPlugins(prev => new Set(prev).add(pluginId))
      
      const result = await qrPluginManager.testPlugin(pluginId)
      
      setTestResults(prev => ({
        ...prev,
        [pluginId]: {
          ...result,
          timestamp: Date.now()
        }
      }))
        // 10秒後に結果を自動削除（QRコードテスト用に時間を延長）
      setTimeout(() => {
        setTestResults(prev => {
          const updated = { ...prev }
          delete updated[pluginId]
          return updated
        })
      }, 10000)
      
    } catch (error) {
      console.error('テストの実行に失敗:', error)
      setTestResults(prev => ({
        ...prev,
        [pluginId]: {
          success: false,
          message: 'テストの実行に失敗しました',
          error: 'UNKNOWN_ERROR',
          timestamp: Date.now()
        }
      }))
    } finally {
      setTestingPlugins(prev => {
        const updated = new Set(prev)
        updated.delete(pluginId)
        return updated
      })
    }
  }
  if (status === "loading" || loading) {
    return (
      <Layout title={t("plugins.title")}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <Layout title={t("plugins.title")}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("plugins.subtitle")}</h1>
              <p className="mt-2 text-gray-600">
                {t("plugins.description")}
              </p>
            </div>
              {/* デバッグ用ボタン */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  qrPluginManager.debugConfig();
                }}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
              >
                デバッグ情報表示
              </button>
              <button
                onClick={() => {
                  qrPluginManager.clearStoredConfig();
                  // 設定をリロード
                  window.location.reload();
                }}
                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                設定リセット
              </button>
              <button
                onClick={() => {
                  // 全てのプラグインを無効化
                  plugins.forEach(plugin => {
                    qrPluginManager.setPluginEnabled(plugin.id, false);
                  });
                  // 設定を更新
                  const updatedConfig = qrPluginManager.getConfig();
                  setConfig(updatedConfig);
                }}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                全て無効化
              </button>
            </div>
          </div>
        </div>

        {/* 現在の設定情報 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">{t("plugins.currentSettings")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">{t("plugins.enabledPlugins")}:</span>
              <span className="ml-2 text-blue-700">{config.enabledPlugins.length}個</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">{t("plugins.defaultWallet")}:</span>
              <span className="ml-2 text-blue-700">
                {config.defaultWalletId ? 
                  plugins.find(p => p.id === config.defaultWalletId)?.wallet.displayName || config.defaultWalletId
                  : '未設定'
                }
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">{t("plugins.registeredPlugins")}:</span>
              <span className="ml-2 text-blue-700">{plugins.length}個</span>
            </div>
          </div>
        </div>

        {/* プラグイン一覧 */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">{t("plugins.availablePlugins")}</h2>
          
          {plugins.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔌</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("plugins.noPlugins")}</h3>
              <p className="text-gray-600">{t("plugins.noPluginsDescription")}</p>
            </div>
          ) : (            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plugins.map((plugin) => (
                <div key={plugin.id} className="relative">                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    isEnabled={config.enabledPlugins.includes(plugin.id)}
                    isDefault={config.defaultWalletId === plugin.id}
                    isTesting={testingPlugins.has(plugin.id)}
                    onToggle={handleTogglePlugin}
                    onSetDefault={handleSetDefault}
                    onTest={handleTestPlugin}
                    onShowQRModal={handleShowQRModal}
                    t={t}
                  />
                  {/* テスト結果の表示 */}{testResults[plugin.id] && (
                    <div className={`absolute top-2 right-2 z-10 animate-in slide-in-from-right-2 duration-300`}>
                      <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        testResults[plugin.id].success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {testResults[plugin.id].success ? '✅ テスト成功' : '❌ テスト失敗'}
                      </div>
                      {/* 詳細結果（常時表示、アニメーション付き） */}
                      <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs z-20 animate-in fade-in zoom-in-95 duration-500">
                        <div className="font-semibold mb-2 text-gray-800">📊 テスト結果詳細</div>                        <div className="space-y-2">
                          <div><span className="font-medium text-gray-700">メッセージ:</span> {testResults[plugin.id].message}</div>
                          {testResults[plugin.id].data && (
                            <>
                              <div><span className="font-medium text-gray-700">ウォレット:</span> {testResults[plugin.id].data.walletName}</div>
                              <div><span className="font-medium text-gray-700">QRサイズ:</span> {testResults[plugin.id].data.qrCodeSize} bytes</div>
                              <div><span className="font-medium text-gray-700">ウォレット種別:</span> {testResults[plugin.id].data.walletType}</div>
                                {/* QRコード表示エリア */}
                              {testResults[plugin.id].data.qrCode && (
                                <div className="border-t pt-3 mt-3 border-gray-200">
                                  <div className="font-medium mb-3 text-blue-700 flex items-center">
                                    📱 生成されたQRコード
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">すぐにテスト可能</span>
                                  </div>
                                  
                                  {/* QRコードデータの検証表示 */}
                                  <div className="text-xs text-gray-500 mb-2">
                                    QRデータ形式: {
                                      testResults[plugin.id].data.qrCode.startsWith('data:image/') 
                                        ? '✅ 正常 (data URL)' 
                                        : '❌ 異常 - ' + testResults[plugin.id].data.qrCode.substring(0, 20) + '...'
                                    }
                                  </div>
                                  
                                  <div className="flex items-start space-x-4">
                                    {/* 通常サイズQRコード */}
                                    <div className="text-center">
                                      <div className="text-xs text-gray-600 mb-1 font-medium">通常サイズ</div>                                      <img 
                                        src={testResults[plugin.id].data.qrCode} 
                                        alt="テスト用QRコード"
                                        className="border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200 animate-in zoom-in-50 delay-100"
                                        style={{ width: '80px', height: '80px' }}                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('通常QRコードクリック:', testResults[plugin.id].data.qrCode.substring(0, 50) + '...');
                                          handleShowQRModal(testResults[plugin.id].data.qrCode, `${plugin.name} - 通常サイズQRコード`);
                                        }}
                                        title="クリックで拡大表示"
                                      />
                                      <div className="text-xs text-gray-500 mt-1">PC確認用</div>
                                    </div>
                                    
                                    {/* スマホテスト用小さめQRコード */}
                                    {testResults[plugin.id].data.smallQrCode && (
                                      <div className="text-center">
                                        <div className="text-xs text-gray-600 mb-1 font-medium">スマホ用</div>                                        <img 
                                          src={testResults[plugin.id].data.smallQrCode} 
                                          alt="スマホテスト用QRコード"
                                          className="border-2 border-green-300 rounded-lg cursor-pointer hover:border-green-400 hover:shadow-md transition-all duration-200 animate-in zoom-in-50 delay-200"
                                          style={{ width: '60px', height: '60px' }}                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('スマホ用QRコードクリック:', testResults[plugin.id].data.smallQrCode.substring(0, 50) + '...');
                                            handleShowQRModal(testResults[plugin.id].data.smallQrCode, `${plugin.name} - スマホ用QRコード`);
                                          }}
                                          title="クリックで拡大表示"
                                        />
                                        <div className="text-xs text-green-600 mt-1 font-medium">📱 推奨</div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* スマホテスト用の説明 */}
                                  <div className="text-xs text-blue-700 mt-3 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 animate-in slide-in-from-bottom-2 delay-300">
                                    <div className="font-semibold mb-1">📱 スマホでテストする方法:</div>
                                    <div className="space-y-1 text-blue-600">
                                      <div>1. 📷 緑枠のQRコードをスマホのカメラで読み取り</div>
                                      <div>2. 🚀 ウォレットアプリが自動で起動します</div>
                                      <div>3. ✅ 決済画面が表示されれば成功です</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                                {testResults[plugin.id].data.uri && (
                                <div className="border-t pt-3 mt-3 border-gray-200">
                                  <span className="font-medium text-gray-700">生成されたURI:</span> 
                                  <div className="text-xs text-gray-500 mb-1">
                                    形式: {
                                      testResults[plugin.id].data.uri.startsWith('symbol:') ? '🔷 Symbol URI' :
                                      testResults[plugin.id].data.uri.startsWith('https://') ? '🌐 HTTPS URL' :
                                      testResults[plugin.id].data.uri.startsWith('http://') ? '🌐 HTTP URL' :
                                      testResults[plugin.id].data.uri.includes('://') ? '🔗 カスタムスキーム' :
                                      '❓ 不明な形式'
                                    }
                                  </div>
                                  <div className="font-mono text-xs break-all bg-gray-50 p-2 rounded mt-2 border border-gray-200">
                                    {testResults[plugin.id].data.uri}
                                  </div>
                                  <div className="flex space-x-2 mt-3">                                    <button
                                      className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors flex items-center space-x-1"                                      onClick={async (e) => {
                                        try {
                                          const uri = testResults[plugin.id].data.uri;
                                          await navigator.clipboard.writeText(uri);
                                          console.log('URIコピー成功:', uri);
                                          
                                          // コピー成功のフィードバック
                                          const button = e.currentTarget as HTMLButtonElement;
                                          const spanElement = button.querySelector('span:last-child');
                                          if (spanElement) {
                                            const originalText = spanElement.textContent;
                                            spanElement.textContent = 'コピー完了!';
                                            button.className = button.className.replace('blue', 'green');
                                            
                                            setTimeout(() => {
                                              if (spanElement && originalText) {
                                                spanElement.textContent = originalText;
                                              }
                                              button.className = button.className.replace('green', 'blue');
                                            }, 2000);
                                          }
                                        } catch (error) {
                                          console.error('URIコピーエラー:', error);
                                          alert('クリップボードへのコピーに失敗しました。');
                                        }
                                      }}
                                    >
                                      <span>📋</span>
                                      <span>URIをコピー</span>
                                    </button><button
                                      onClick={() => {
                                        try {
                                          // URIの妥当性をチェック
                                          const uri = testResults[plugin.id].data.uri;
                                          console.log('URIを開く:', uri);
                                          
                                          if (uri && (uri.startsWith('symbol:') || uri.startsWith('https://') || uri.startsWith('http://') || uri.includes('://'))) {
                                            window.open(uri, '_blank', 'noopener,noreferrer');
                                          } else {
                                            console.warn('無効なURI:', uri);
                                            alert(`無効なURIです: ${uri}\n\nサポートされている形式:\n- symbol://\n- https://\n- http://\n- カスタムスキーム`);
                                          }
                                        } catch (error) {
                                          console.error('URI開くときのエラー:', error);
                                          alert('URIを開くときにエラーが発生しました。');
                                        }
                                      }}
                                      className="text-xs text-green-600 hover:text-green-800 px-3 py-1.5 bg-green-50 rounded-md border border-green-200 hover:bg-green-100 transition-colors flex items-center space-x-1"
                                    >
                                      <span>🔗</span>
                                      <span>URIを開く</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {testResults[plugin.id].error && (
                            <div className="text-red-700 bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                              <span className="font-medium">❌ エラー:</span> {testResults[plugin.id].error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 保存状態表示 */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {t("plugins.saving")}
          </div>
        )}

        {/* 使用方法ガイド */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🛠️ {t("plugins.usage.title")}</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">1</span>
              <p>{t("plugins.usage.step1")}</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">2</span>
              <p>{t("plugins.usage.step2")}</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">3</span>
              <p>{t("plugins.usage.step3")}</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">4</span>
              <p>{t("plugins.usage.step4")}</p>
            </div>          </div>
        </div>
      </div>

      {/* QRコードモーダル */}
      <QRModal
        isOpen={qrModalData.isOpen}
        onClose={handleCloseQRModal}
        qrData={qrModalData.qrData}
        title={qrModalData.title}
      />
    </Layout>
  )
}
