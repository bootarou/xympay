"use client"

import { useState } from 'react'
import { useTranslation, Locale } from '../lib/i18n'

const languages = [
  { code: 'ja' as Locale, name: '日本語', flag: '🇯🇵' },
  { code: 'en' as Locale, name: 'English', flag: '🇺🇸' },
  { code: 'zh' as Locale, name: '中文', flag: '🇨🇳' },
]

export default function LanguageSwitcher() {
  const { locale, setLocale, t, isInitialized } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  
  // 初期化が完了するまではデフォルト言語を使用
  const currentLanguage = languages.find(lang => lang.code === (isInitialized ? locale : 'ja')) || languages[0]

  const handleLanguageChange = (newLocale: Locale) => {
    if (isChanging) return // 重複実行を防止
    
    setIsChanging(true)
    setLocale(newLocale)
    setIsOpen(false)
    
    // 少し待機してから確実にリロード
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  // 初期化が完了していない間は空の状態を表示
  if (!isInitialized) {
    return (
      <div className="relative">
        <button
          disabled
          className="flex items-center space-x-2 p-2 rounded-lg transition-colors w-full opacity-50"
        >
          <span className="text-lg">🇯🇵</span>
          <span className="text-sm font-medium text-gray-700">日本語</span>
          <svg
            className="w-4 h-4 ml-auto transform transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="relative">      <button
        onClick={() => !isChanging && setIsOpen(!isOpen)}
        disabled={isChanging}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors w-full ${
          isChanging 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-100'
        }`}
      >
        <span className="text-lg">{currentLanguage.flag}</span>        <span className="text-sm font-medium text-gray-700">
          {isChanging ? t('common.changing') : currentLanguage.name}
        </span>
        {isChanging ? (
          <div className="w-4 h-4 ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          </div>
        ) : (
          <svg
            className={`w-4 h-4 transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>      {isOpen && !isChanging && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={isChanging}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                    locale === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span>{language.name}</span>
                  {locale === language.code && (
                    <svg className="w-4 h-4 ml-auto text-blue-700" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
