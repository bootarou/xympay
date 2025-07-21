"use client"

import { useState, useEffect } from 'react'
import { useExtendedSettings } from '../hooks/useExtendedSettings'
import { SUPPORTED_CURRENCIES } from '../lib/exchange-rate/types'

interface ExchangeRateProviderInfo {
  id: string
  name: string
  version: string
  description: string
  supportedCurrencies: string[]
}

export function CurrencySettingsComponent() {
  const { settings, isLoading, updateBaseCurrency, updateCurrencySettings } = useExtendedSettings()
  const [providers, setProviders] = useState<ExchangeRateProviderInfo[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [testingRate, setTestingRate] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // プロバイダー一覧を取得
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true)
      try {
        const response = await fetch('/api/exchange-rates/providers')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setProviders(data.data.available)
          }
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error)
      } finally {
        setLoadingProviders(false)
      }
    }

    fetchProviders()
  }, [])

  // テストレート取得
  const handleTestRate = async () => {
    setTestingRate(true)
    setTestResult(null)
    
    try {
      const response = await fetch(`/api/exchange-rates/XYM/${settings.baseCurrency}?provider=${settings.currencySettings.rateProvider}`)
      const data = await response.json()
      
      if (data.success) {
        setTestResult(`1 XYM = ${data.data.rate.toFixed(settings.currencySettings.displayDecimals)} ${settings.baseCurrency}`)
      } else {
        setTestResult(`エラー: ${data.message}`)
      }
    } catch (error) {
      setTestResult(`エラー: ${error}`)
    } finally {
      setTestingRate(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">通貨設定</h3>
        <p className="text-sm text-gray-600 mb-6">
          課税売上計算のための基準通貨と為替レート取得設定を管理します。
        </p>
      </div>

      {/* 基準通貨選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          基準通貨
        </label>
        <select
          value={settings.baseCurrency}
          onChange={(e) => updateBaseCurrency(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {SUPPORTED_CURRENCIES.map(currency => (
            <option key={currency} value={currency}>
              {currency} - {getCurrencyName(currency)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          売上集計や課税計算で使用する基準通貨を選択してください。
        </p>
      </div>

      {/* 表示桁数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          表示桁数
        </label>
        <input
          type="number"
          min="0"
          max="8"
          value={settings.currencySettings.displayDecimals}
          onChange={(e) => updateCurrencySettings({ displayDecimals: parseInt(e.target.value) })}
          className="mt-1 block w-32 border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          為替レートの小数点桁数（0-8桁）
        </p>
      </div>

      {/* レートプロバイダー選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          レート取得プロバイダー
        </label>
        {loadingProviders ? (
          <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
        ) : (
          <select
            value={settings.currencySettings.rateProvider}
            onChange={(e) => updateCurrencySettings({ rateProvider: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.description}
              </option>
            ))}
          </select>
        )}
        <p className="mt-1 text-sm text-gray-500">
          為替レートを取得するAPIプロバイダーを選択してください。
        </p>
      </div>

      {/* 自動更新設定 */}
      <div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoUpdateRate"
            checked={settings.currencySettings.autoUpdateRate}
            onChange={(e) => updateCurrencySettings({ autoUpdateRate: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoUpdateRate" className="ml-2 block text-sm text-gray-900">
            為替レートの自動更新を有効にする
          </label>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          決済時に最新の為替レートを自動取得します。
        </p>
      </div>

      {/* 更新間隔 */}
      {settings.currencySettings.autoUpdateRate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            更新間隔（秒）
          </label>
          <input
            type="number"
            min="60"
            max="3600"
            step="60"
            value={settings.currencySettings.updateInterval}
            onChange={(e) => updateCurrencySettings({ updateInterval: parseInt(e.target.value) })}
            className="mt-1 block w-32 border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            為替レートキャッシュの有効期間（60-3600秒）
          </p>
        </div>
      )}

      {/* テスト取得 */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">レート取得テスト</h4>
          <button
            onClick={handleTestRate}
            disabled={testingRate || !settings.currencySettings.rateProvider}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingRate ? '取得中...' : 'テスト取得'}
          </button>
        </div>
        
        {testResult && (
          <div className={`p-3 rounded-md text-sm ${
            testResult.startsWith('エラー') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {testResult}
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-2">
          現在の設定でXYMの為替レートが正しく取得できるかテストします。
        </p>
      </div>
    </div>
  )
}

// 通貨名のマッピング
function getCurrencyName(currency: string): string {
  const names: Record<string, string> = {
    'JPY': '日本円',
    'USD': '米ドル',
    'EUR': 'ユーロ',
    'GBP': '英ポンド',
    'AUD': '豪ドル',
    'CAD': 'カナダドル',
    'CHF': 'スイスフラン',
    'CNY': '中国元',
    'KRW': '韓国ウォン'
  }
  
  return names[currency] || currency
}
