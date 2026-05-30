import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { translations, Lang, TranslationKey } from './translations'

const STORAGE_KEY = 'nzxtcam-lang'

function detectDefault(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'fr') return stored
  const browser = navigator.language?.slice(0, 2)
  return browser === 'fr' ? 'fr' : 'en'
}

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangCtx | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDefault)

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations['en'] as Record<string, string>)[key]
      ?? key
  }, [lang])

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLanguage must be used inside LangProvider')
  return ctx
}
