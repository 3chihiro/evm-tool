import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'

type Lang = 'ja' | 'en'

type Dict = Record<string, string>

const JA: Dict = {
  'app.title': 'EVM Tool UI Shell',
  'panels.gantt': 'ガント',
  'panels.tasks': 'タスク一覧',
  'panels.evm': 'EVM',
  'header.minMonths': '最小月数',
  'header.zoom': 'ズーム(px/日)',
  'header.unknownDeps': '未知依存の扱い',
  'header.lang': '言語',
  'header.lang.ja': '日本語',
  'header.lang.en': 'English',
  'buttons.exportCsv': 'CSV出力',
  'buttons.exportPdf': 'PDF出力',
  'modal.importResult': 'CSVインポート結果',
  'panel.importErrors': 'インポートエラー',
  'panel.holidays': '祝日設定',
  'panel.offweek': '固定休日（曜日）',
  'alerts.pdfElectronOnly': 'Electron環境でのみPDF出力が利用できます。',
}

const EN: Dict = {
  'app.title': 'EVM Tool UI Shell',
  'panels.gantt': 'Gantt',
  'panels.tasks': 'Tasks',
  'panels.evm': 'EVM',
  'header.minMonths': 'Min months',
  'header.zoom': 'Zoom (px/day)',
  'header.unknownDeps': 'Unknown deps',
  'header.lang': 'Language',
  'header.lang.ja': 'Japanese',
  'header.lang.en': 'English',
  'buttons.exportCsv': 'Export CSV',
  'buttons.exportPdf': 'Export PDF',
  'modal.importResult': 'CSV Import Result',
  'panel.importErrors': 'Import Errors',
  'panel.holidays': 'Holidays',
  'panel.offweek': 'Fixed off-days (weekday)',
  'alerts.pdfElectronOnly': 'PDF export is available only in Electron.',
}

const DICTS: Record<Lang, Dict> = { ja: JA, en: EN }

type I18nCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('evm_lang')
      return saved === 'en' ? 'en' : 'ja'
    } catch { return 'ja' }
  })
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('evm_lang', l) } catch {}
  }
  const t = (key: string) => (DICTS[lang][key] ?? key)
  const value = useMemo(() => ({ lang, setLang, t }), [lang])
  useEffect(() => { /* no-op: ensure reactive localStorage save in setLang */ }, [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const DEFAULT_CTX: I18nCtx = {
  lang: 'ja',
  setLang: () => {},
  t: (key: string) => (DICTS['ja'][key] ?? key),
}

export function useI18n() {
  const ctx = useContext(Ctx)
  return ctx ?? DEFAULT_CTX
}
