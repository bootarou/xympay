import { useState, useEffect, useCallback } from "react"

export interface UserSettings {
  autoPaymentMonitoring: boolean
  notifications: boolean
  emailNotifications: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  autoPaymentMonitoring: true,
  notifications: true,
  emailNotifications: true,
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 設定をAPIから読み込み
  const loadSettings = useCallback(async () => {
    if (typeof window === "undefined") return
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        console.warn('Failed to load settings, using defaults')
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setIsLoading(false)
      setIsLoaded(true)
    }
  }, [])

  // 設定をAPIに保存
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (typeof window === "undefined") return
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings', {
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
        console.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // 個別設定更新関数
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
    reload: loadSettings,
  }
}
