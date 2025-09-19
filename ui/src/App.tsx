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

const useTasksHistory = createUseHistory<TaskRow[]>([])

export default function App() {
  const hist = useTasksHistory()
  const tasks = hist.present
  const [errors, setErrors] = useState<string[]>([])
  const [rawErrors, setRawErrors] = useState<ImportError[] | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
  const [errorByColumn, setErrorByColumn] = useState<Record<string, number> | undefined>(undefined)
  const [importStats, setImportStats] = useState<{ rows: number; imported: number; failed: number } | undefined>(undefined)
  const [unknownDepsMode, setUnknownDepsMode] = useState<'error' | 'warn'>(() => {
    try {
      const v = localStorage.getItem('evm_unknown_deps')
      return (v === 'warn' || v === 'error') ? v : 'error'
    } catch { return 'error' }
  })
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false)
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
      setImportStats({ rows: res.stats.rows, imported: res.stats.imported, failed: res.stats.failed })
      setSelectedIds([])
      setShowImportDialog(true)
    }
    reader.readAsText(f, 'utf-8')
  }, [unknownDepsMode])

  const projectName = useMemo(() => tasks[0]?.projectName ?? '', [tasks])

  const onExportPDF = useCallback(async () => {
    if (!('appBridge' in window) || typeof window.appBridge.exportPDF !== 'function') {
      alert('Electron環境でのみPDF出力が利用できます。')
      return
    }
    const saved = await window.appBridge.exportPDF({ landscape: false })
    if (saved) alert(`PDFを保存しました: ${saved}`)
  }, [])

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
      <Modal open={showImportDialog} title="CSVインポート結果" onClose={() => setShowImportDialog(false)}>
        {importStats ? (
          <div>
            <div style={{ marginBottom: 8, fontSize: 13 }}>
              行数 {importStats.rows} / 取込 {importStats.imported} / 失敗 {importStats.failed}
            </div>
            {errorByColumn && Object.keys(errorByColumn).length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 12, color: '#333' }}>
                列別件数: {Object.entries(errorByColumn).map(([k,v]) => `${k}:${v}`).join(' / ')}
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
        <h1>EVM Tool UI Shell</h1>
        <div style={{ marginLeft: '16px', fontSize: 12, color: '#666' }}>{projectName && `（${projectName}）`}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={onFileChange} />
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#333' }}>
            未知依存の扱い
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
          <button onClick={onExportCsv}>CSV出力</button>
          <button onClick={onExportPDF}>PDF出力</button>
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
            <div className="panel-title">インポートエラー</div>
            {importStats && (
              <div style={{ margin: '4px 0', fontSize: 12, color: '#333' }}>
                要約: 行数 {importStats.rows} / 取込 {importStats.imported} / 失敗 {importStats.failed}
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
              }}>エラーCSVを保存</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <div className="panel-title">祝日設定</div>
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
            <div className="panel-title">固定休日（曜日）</div>
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
