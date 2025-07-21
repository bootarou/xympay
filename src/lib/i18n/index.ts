import { useState, useEffect } from 'react'
import ja from './ja.json'
import en from './en.json'
import zh from './zh.json'

const translations = {
  ja,
  en,
  zh,
}

export type Locale = keyof typeof translations
export type TranslationKey = string

// ネストされたオブジェクトから値を取得するヘルパー関数
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : path
  }, obj)
}

// ローカルストレージキー
const LOCALE_STORAGE_KEY = 'xympay-locale'

// ブラウザの言語設定から初期ロケールを取得
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ja'
  
  // 1. ローカルストレージから取得
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && stored in translations) {
    return stored as Locale
  }
  
  // 2. ブラウザの言語設定から取得
  const browserLang = navigator.language.split('-')[0]
  if (browserLang in translations) {
    return browserLang as Locale
  }
  
  // 3. デフォルト
  return 'ja'
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>('ja')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initialLocale = getInitialLocale()
    setLocaleState(initialLocale)
    setIsInitialized(true)
  }, [])

  // ローカルストレージの変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      const newLocale = getInitialLocale()
      setLocaleState(newLocale)
    }

    // storage イベントリスナーを追加（同一タブ内の変更には反応しないため、カスタムイベントも追加）
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('localeChange', handleStorageChange)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange', handleStorageChange)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
      // カスタムイベントを発火して他のコンポーネントに通知
      window.dispatchEvent(new Event('localeChange'))
    }
  }

  const t = (key: TranslationKey): string => {
    // サーバーサイドとクライアントサイドで一貫性を保つため、常にデフォルトロケール(ja)の翻訳を返す
    // クライアントサイドで初期化後に適切なロケールが適用される
    const currentLocale = isInitialized ? locale : 'ja'
    const translation = translations[currentLocale]
    return getNestedValue(translation, key) || key
  }

  return {
    t,
    locale,
    setLocale,
    isInitialized,
  }
}

export function getStaticTranslation(locale: Locale = 'ja') {
  const translation = translations[locale]
  
  const t = (key: TranslationKey): string => {
    return getNestedValue(translation, key) || key
  }

  return { t, locale }
}
