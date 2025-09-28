import React, { useCallback, useMemo, useState, useEffect } from 'react'
import GanttCanvas from './components/GanttCanvas'
import TaskTable from './components/TaskTable'
import TaskDetailsPanel from './components/TaskDetailsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import EvmCard from './components/EvmCard'
import Modal from './components/Modal'
import type { TaskRow } from '../../evm-mvp-sprint1/src.types'
import { parseCsvTextBrowser, toCsvBrowser, triggerDownloadCsv, errorsToCsv } from '../../src/adapters'
import type { ImportError } from '../../evm-mvp-sprint1/src.types'
import { createUseHistory, type Command } from './lib/history'
import type { Calendar } from '../../evm-mvp-sprint1/evm'
import { useI18n } from './i18n/i18n'

const useTasksHistory = createUseHistory<TaskRow[]>([])

export default function App() {
  const hist = useTasksHistory()
  const tasks = hist.present
  const { t, lang, setLang } = useI18n()
  const [errors, setErrors] = useState<string[]>([])
  const [rawErrors, setRawErrors] = useState<ImportError[] | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
  const [errorByColumn, setErrorByColumn] = useState<Record<string, number> | undefined>(undefined)
  const [importStats, setImportStats] = useState<{ rows: number; imported: number; failed: number; dep?: { cycles: number; isolated: number; unknownRefs?: number; cyclesList?: number[][] } } | undefined>(undefined)
  const [liveMessage, setLiveMessage] = useState<string>('')
  const [unknownDepsMode, setUnknownDepsMode] = useState<'error' | 'warn'>(() => {
    try {
      const v = localStorage.getItem('evm_unknown_deps')
      return (v === 'warn' || v === 'error') ? v : 'error'
    } catch { return 'error' }
  })
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false)
  const [depOpen, setDepOpen] = useState<boolean>(true)
  const [calendar, setCalendar] = useState<Calendar>(() => {
    // restore from localStorage
    try {
      const saved = localStorage.getItem('evm_calendar_holidays')
      const holidays = saved ? JSON.parse(saved) as string[] : []
      const offSaved = localStorage.getItem('evm_calendar_offweek')
      const offWeekdays = offSaved ? JSON.parse(offSaved) as number[] : [0,6]
      return { holidays, offWeekdays }
    } catch { return { holidays: [] } }
  })

  // 設定: 最小表示月数（2/3/6）
  const [minMonths, setMinMonths] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('evm_min_months')); return (v === 2 || v === 3 || v === 6) ? v : 3 } catch { return 3 }
  })
  useEffect(() => { try { localStorage.setItem('evm_min_months', String(minMonths)) } catch {} }, [minMonths])

  // 設定: 初期ズーム（px/日）
  const [pxPerDay, setPxPerDay] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('evm_px_per_day')); return [8,12,16,24,32].includes(v) ? v : 16 } catch { return 16 }
  })
  useEffect(() => { try { localStorage.setItem('evm_px_per_day', String(pxPerDay)) } catch {} }, [pxPerDay])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const res = parseCsvTextBrowser(text, { unknownDeps: unknownDepsMode })
      hist.set(res.tasks)
      setRawErrors(res.errors)
      setErrors(res.errors.map((er) => `Row ${er.row} ${er.column ?? ''} ${er.message}`))
      setErrorByColumn(res.stats.byColumn)
      const stats = { rows: res.stats.rows, imported: res.stats.imported, failed: res.stats.failed, dep: res.stats.dep }
      setImportStats(stats)
      // 折りたたみの初期状態: 問題があるときは開く
      const openInit = !!(res.stats.dep && ((res.stats.dep.cycles ?? 0) > 0 || (res.stats.dep.unknownRefs ?? 0) > 0))
      setDepOpen(openInit)
      setLiveMessage(`CSVを読み込みました。行数 ${res.stats.rows}、取込 ${res.stats.imported}、失敗 ${res.stats.failed}`)
      setSelectedIds([])
      setShowImportDialog(true)
    }
    reader.readAsText(f, 'utf-8')
  }, [unknownDepsMode])

  const projectName = useMemo(() => tasks[0]?.projectName ?? '', [tasks])

  const onExportPDF = useCallback(async () => {
    if (!('appBridge' in window) || typeof window.appBridge.exportPDF !== 'function') {
      alert(t('alerts.pdfElectronOnly'))
      return
    }
    const saved = await window.appBridge.exportPDF({ landscape: false })
    if (saved) alert(`PDFを保存しました: ${saved}`)
  }, [t])

  const onExportCsv = useCallback(() => {
    const text = toCsvBrowser(tasks)
    const name = (projectName || 'project') + '.csv'
    triggerDownloadCsv(name, text)
  }, [tasks, projectName])
  const onAddHoliday = useCallback((iso: string) => {
    if (!iso) return
    setCalendar((c) => {
      const set = new Set(c.holidays ?? [])
      set.add(iso)
      const next = { holidays: Array.from(set).sort() }
      localStorage.setItem('evm_calendar_holidays', JSON.stringify(next.holidays))
      return next
    })
  }, [])
  const onRemoveHoliday = useCallback((iso: string) => {
    setCalendar((c) => {
      const next = { holidays: (c.holidays ?? []).filter((d) => d !== iso) }
      const merged: Calendar = { holidays: next.holidays, offWeekdays: c.offWeekdays }
      localStorage.setItem('evm_calendar_holidays', JSON.stringify(merged.holidays))
      return merged
    })
  }, [])
  const toggleOffWeek = useCallback((w: number) => {
    setCalendar((c) => {
      const set = new Set(c.offWeekdays ?? [0,6])
      if (set.has(w)) set.delete(w); else set.add(w)
      const merged: Calendar = { holidays: c.holidays ?? [], offWeekdays: Array.from(set).sort() }
      localStorage.setItem('evm_calendar_offweek', JSON.stringify(merged.offWeekdays))
      return merged
    })
  }, [])

  return (
    <div className="app-grid">
      {/* aria-live for accessibility announcements */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>{liveMessage}</div>
      <Modal open={showImportDialog} title={t('modal.importResult')} onClose={() => setShowImportDialog(false)}>
        {importStats ? (
          <div>
            <div style={{ marginBottom: 8, fontSize: 13 }}>
              行数 {importStats.rows} / 取込 {importStats.imported} / 失敗 {importStats.failed}
            </div>
            {importStats.dep && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#333' }}>
                依存: 循環 {importStats.dep.cycles} / 孤立 {importStats.dep.isolated}
                {typeof importStats.dep.unknownRefs === 'number' && unknownDepsMode === 'warn' && (
                  <> / 未知参照 {importStats.dep.unknownRefs}</>
                )}
              </div>
            )}
            {importStats?.dep?.cyclesList && importStats.dep.cyclesList.length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#333' }}>
                循環例: {importStats.dep.cyclesList.slice(0,1).map((arr, i) => (
                  <span key={i}>{arr.concat(arr[0]).join(' → ')}</span>
                ))}
              </div>
            )}
            {errorByColumn && Object.keys(errorByColumn).length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#333' }}>
                列別件数: {Object.entries(errorByColumn).map(([k,v]) => `${k}:${v}`).join(' / ')}
              </div>
            )}
            {importStats?.dep && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#333', border: '1px solid #eee', borderRadius: 6 }}>
                <button
                  className="btn"
                  aria-expanded={depOpen}
                  onClick={() => setDepOpen(v => !v)}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: '6px 6px 0 0', border: 'none', background: '#fafafa' }}
                >
                  <span style={{ marginRight: 6 }}>{depOpen ? '▾' : '▸'}</span>
                  <span style={{ fontWeight: 600 }}>依存チェック</span>
                  <span style={{ marginLeft: 8, color: '#666' }}>
                    （循環 {importStats.dep.cycles} / 孤立 {importStats.dep.isolated}
                    {typeof importStats.dep.unknownRefs === 'number' && unknownDepsMode === 'warn' && (
                      <> / 未知参照 {importStats.dep.unknownRefs}</>
                    )}
                    ）
                  </span>
                </button>
                {depOpen && (
                  <div style={{ padding: '6px 8px' }}>
                    {importStats.dep.cyclesList && importStats.dep.cyclesList.length > 0 ? (
                      <div>
                        循環例: {importStats.dep.cyclesList.slice(0, 3).map((arr, i) => (
                          <span key={i} style={{ marginRight: 8 }}>{arr.concat(arr[0]).join(' → ')}</span>
                        ))}
                      </div>
                    ) : (
                      <div>詳細なし</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>先頭のエラー（最大10件）</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={i} style={{ color: '#b00', fontSize: 12 }}>{e}</li>
                  ))}
                </ul>
                <div style={{ marginTop: 8 }}>
                  <button className="btn" onClick={() => {
                    if (!rawErrors || rawErrors.length === 0) return
                    const csv = errorsToCsv(rawErrors)
                    triggerDownloadCsv('import-errors.csv', csv)
                  }}>エラーCSVを保存</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>結果なし</div>
        )}
      </Modal>
      <header className="header">
        <h1>{t('app.title')}</h1>
        <div style={{ marginLeft: '16px', fontSize: 12, color: '#666' }}>{projectName && `（${projectName}）`}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={onFileChange} />
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#333' }}>
            {t('header.minMonths')}
            <select value={minMonths} onChange={(e) => setMinMonths(Number(e.target.value))} style={{ fontSize: 12 }}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={6}>6</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#333' }}>
            {t('header.zoom')}
            <select value={pxPerDay} onChange={(e) => setPxPerDay(Number(e.target.value))} style={{ fontSize: 12 }}>
              {[8,12,16,24,32].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#333' }}>
            {t('header.unknownDeps')}
            <select
              value={unknownDepsMode}
              onChange={(e) => {
                const v = (e.target.value === 'warn') ? 'warn' : 'error'
                setUnknownDepsMode(v)
                try { localStorage.setItem('evm_unknown_deps', v) } catch {}
              }}
              style={{ fontSize: 12 }}
            >
              <option value="error">厳格（エラーで除外）</option>
              <option value="warn">警告（取り込む）</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#333' }}>
            {t('header.lang')}
            <select value={lang} onChange={(e) => setLang(e.target.value === 'en' ? 'en' : 'ja')} style={{ fontSize: 12 }}>
              <option value="ja">{t('header.lang.ja')}</option>
              <option value="en">{t('header.lang.en')}</option>
            </select>
          </label>
          <button onClick={onExportCsv}>{t('buttons.exportCsv')}</button>
          <button onClick={onExportPDF}>{t('buttons.exportPdf')}</button>
        </div>
      </header>
      <section className="gantt">
        <ErrorBoundary>
        <GanttCanvas
          tasks={tasks}
          onTasksChange={(cmd: Command<TaskRow[]>) => hist.run(cmd)}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          calendar={calendar}
          minMonths={minMonths}
          pxPerDay={pxPerDay}
        />
        </ErrorBoundary>
      </section>
      <section className="tasks">
        <ErrorBoundary>
        <TaskDetailsPanel tasks={tasks} selectedIds={selectedIds} onTasksChange={(cmd) => hist.run(cmd)} />
        </ErrorBoundary>
        <div style={{ height: 8 }} />
        <TaskTable tasks={tasks} selectedIds={selectedIds} onSelect={setSelectedIds} />
      </section>
      <aside className="evm">
        <EvmCard tasks={tasks} calendar={calendar} />
        {errors.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="panel-title">{t('panel.importErrors')}</div>
            {importStats && (
              <div style={{ margin: '4px 0', fontSize: 12, color: '#333' }}>
                要約: 行数 {importStats.rows} / 取込 {importStats.imported} / 失敗 {importStats.failed}
                {importStats.dep && (
                  <>
                    {' '}・ 依存: 循環 {importStats.dep.cycles} / 孤立 {importStats.dep.isolated}
                    {typeof importStats.dep.unknownRefs === 'number' && unknownDepsMode === 'warn' && (
                      <> / 未知参照 {importStats.dep.unknownRefs}</>
                    )}
                  </>
                )}
              </div>
            )}
            {errorByColumn && Object.keys(errorByColumn).length > 0 && (
              <div style={{ margin: '4px 0 8px', fontSize: 12, color: '#333' }}>
                列別件数: {Object.entries(errorByColumn).map(([k,v]) => `${k}:${v}`).join(' / ')}
              </div>
            )}
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {errors.map((e, i) => (
                <li key={i} style={{ color: '#b00', fontSize: 12 }}>{e}</li>
              ))}
            </ul>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => {
                if (!rawErrors || rawErrors.length === 0) return
                const csv = errorsToCsv(rawErrors)
                triggerDownloadCsv('import-errors.csv', csv)
                setLiveMessage('インポートエラーのCSVを保存しました')
              }}>エラーCSVを保存</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <div className="panel-title">{t('panel.holidays')}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" onChange={(e) => onAddHoliday(e.target.value)} />
            <button className="btn" onClick={() => { localStorage.removeItem('evm_calendar_holidays'); setCalendar({ holidays: [] }) }}>クリア</button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(calendar.holidays ?? []).map((d) => (
              <span key={d} style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                {d} <button className="btn" style={{ padding: '0 6px', marginLeft: 4 }} onClick={() => onRemoveHoliday(d)}>×</button>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="panel-title">{t('panel.offweek')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['日','月','火','水','木','金','土'].map((label, idx) => (
                <label key={idx} style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={(calendar.offWeekdays ?? [0,6]).includes(idx)} onChange={() => toggleOffWeek(idx)} /> {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <footer className="status">
        <div>
          選択中 {selectedIds.length} 件 ・ Escでキャンセル
        </div>
        <div>
          <button className="btn" disabled={selectedIds.length === 0} onClick={() => setSelectedIds([])}>選択解除</button>
        </div>
      </footer>
    </div>
  )
}
