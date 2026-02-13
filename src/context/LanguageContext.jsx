import { createContext, useState, useEffect, useCallback } from 'react'
import { translations } from '../data/translations'

export const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Get initial language from localStorage or default to 'ar'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || 'ar'
    }
    return 'ar'
  })

  // Apply language and direction to document
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('lang', language)
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
    localStorage.setItem('language', language)

    // Update document title based on language
    document.title = language === 'ar' 
      ? 'أكاديمية أسباير - بناء أبطال المستقبل'
      : 'ASPIRE Academy - Building Future Champions'
  }, [language])

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en')
  }, [])

  // Translation function with nested path support
  const t = useCallback((path) => {
    const keys = path.split('.')
    let result = translations

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        console.warn(`Translation not found for path: ${path}`)
        return path
      }
    }

    if (result && typeof result === 'object' && language in result) {
      return result[language]
    }

    console.warn(`Language "${language}" not found for path: ${path}`)
    return path
  }, [language])

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isRTL: language === 'ar',
    isArabic: language === 'ar',
    isEnglish: language === 'en',
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

