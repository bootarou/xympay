import { useState, useEffect, useCallback } from "react"
import { CurrencySettings, SUPPORTED_CURRENCIES, SupportedCurrency } from '../lib/exchange-rate/types'

export interface ExtendedUserSettings {
  autoPaymentMonitoring: boolean
  notifications: boolean
  emailNotifications: boolean
  
  // 通貨設定
  baseCurrency: string
  currencySettings: CurrencySettings
}

const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: 'JPY',
  displayDecimals: 2,
  rateProvider: 'coingecko',
  autoUpdateRate: true,
  fallbackRateProvider: 'coingecko',
  updateInterval: 300 // 5分
}

const DEFAULT_EXTENDED_SETTINGS: ExtendedUserSettings = {
  autoPaymentMonitoring: true,
  notifications: true,
  emailNotifications: true,
  baseCurrency: 'JPY',
  currencySettings: DEFAULT_CURRENCY_SETTINGS,
}

export function useExtendedSettings() {
  const [settings, setSettings] = useState<ExtendedUserSettings>(DEFAULT_EXTENDED_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 設定をAPIから読み込み
  const loadSettings = useCallback(async () => {
    if (typeof window === "undefined") return
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings/extended')
      
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data.settings }))
      } else {
        console.warn('Failed to load extended settings, using defaults')
        setSettings(DEFAULT_EXTENDED_SETTINGS)
      }
    } catch (error) {
      console.error('Error loading extended settings:', error)
      setSettings(DEFAULT_EXTENDED_SETTINGS)
    } finally {
      setIsLoading(false)
      setIsLoaded(true)
    }
  }, [])

  // 設定をAPIに保存
  const saveSettings = useCallback(async (newSettings: Partial<ExtendedUserSettings>) => {
    if (typeof window === "undefined") return
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings/extended', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data.settings }))
      } else {
        console.error('Failed to save extended settings')
      }
    } catch (error) {
      console.error('Error saving extended settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // 通貨設定更新関数
  const updateBaseCurrency = useCallback(async (currency: string) => {
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
      console.error('Unsupported currency:', currency)
      return
    }
    
    const newSettings = { 
      baseCurrency: currency,
      currencySettings: { ...settings.currencySettings, baseCurrency: currency }
    }
    setSettings(prev => ({ ...prev, ...newSettings }))
    await saveSettings(newSettings)
  }, [settings.currencySettings, saveSettings])

  const updateCurrencySettings = useCallback(async (currencySettings: Partial<CurrencySettings>) => {
    const newCurrencySettings = { ...settings.currencySettings, ...currencySettings }
    const newSettings = { currencySettings: newCurrencySettings }
    
    setSettings(prev => ({ ...prev, ...newSettings }))
    await saveSettings(newSettings)
  }, [settings.currencySettings, saveSettings])

  // 既存の個別設定更新関数
  const updateAutoPaymentMonitoring = useCallback(async (value: boolean) => {
    const newSettings = { autoPaymentMonitoring: value }
    setSettings(prev => ({ ...prev, ...newSettings }))
    await saveSettings(newSettings)
  }, [saveSettings])

  const updateNotifications = useCallback(async (value: boolean) => {
    const newSettings = { notifications: value }
    setSettings(prev => ({ ...prev, ...newSettings }))
    await saveSettings(newSettings)
  }, [saveSettings])

  const updateEmailNotifications = useCallback(async (value: boolean) => {
    const newSettings = { emailNotifications: value }
    setSettings(prev => ({ ...prev, ...newSettings }))
    await saveSettings(newSettings)
  }, [saveSettings])

  return {
    settings,
    isLoaded,
    isLoading,
    updateAutoPaymentMonitoring,
    updateNotifications,
    updateEmailNotifications,
    updateBaseCurrency,
    updateCurrencySettings,
    loadSettings,
    saveSettings,
  }
}

// 後方互換性のため、元のuseSettingsも維持
export const useSettings = useExtendedSettings;
