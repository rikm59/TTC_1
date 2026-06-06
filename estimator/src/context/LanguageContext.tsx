import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Lang } from '../i18n/translations'

interface LanguageContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('ttc_lang')
    return (stored === 'es' ? 'es' : 'en') as Lang
  })

  useEffect(() => {
    localStorage.setItem('ttc_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => setLangState(l)

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const dict = translations[lang] as Record<string, string>
    let str = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v))
      })
    }
    return str
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
