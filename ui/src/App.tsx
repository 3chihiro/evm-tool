import React, { useCallback, useMemo, useState, useEffect } from 'react'
import GanttCanvas from './components/GanttCanvas'
import TaskTable from './components/TaskTable'
import EvmCard from './components/EvmCard'
import type { TaskRow } from '../../evm-mvp-sprint1/src.types'
import { parseCsvTextBrowser } from '../../src/adapters'
import { createUseHistory, type Command } from './lib/history'

const useTasksHistory = createUseHistory<TaskRow[]>([])

export default function App() {
  const hist = useTasksHistory()
  const tasks = hist.present
  const [errors, setErrors] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const res = parseCsvTextBrowser(text)
      hist.set(res.tasks)
      setErrors(res.errors.map((er) => `Row ${er.row} ${er.column ?? ''} ${er.message}`))
      setSelectedIds([])
    }
    reader.readAsText(f, 'utf-8')
  }, [])

  const projectName = useMemo(() => tasks[0]?.projectName ?? '', [tasks])

  const onExportPDF = useCallback(async () => {
    if (!('appBridge' in window) || typeof window.appBridge.exportPDF !== 'function') {
      alert('Electron環境でのみPDF出力が利用できます。')
      return
    }
    const saved = await window.appBridge.exportPDF({ landscape: false })
    if (saved) alert(`PDFを保存しました: ${saved}`)
  }, [])

  return (
    <div className="app-grid">
      <header className="header">
        <h1>EVM Tool UI Shell</h1>
        <div style={{ marginLeft: '16px', fontSize: 12, color: '#666' }}>{projectName && `（${projectName}）`}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={onFileChange} />
          <button onClick={onExportPDF}>PDF出力</button>
        </div>
      </header>
      <section className="gantt">
        <GanttCanvas
          tasks={tasks}
          onTasksChange={(cmd: Command<TaskRow[]>) => hist.run(cmd)}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
        />
      </section>
      <section className="tasks">
        <TaskTable tasks={tasks} />
      </section>
      <aside className="evm">
        <EvmCard tasks={tasks} />
        {errors.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="panel-title">インポートエラー</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {errors.map((e, i) => (
                <li key={i} style={{ color: '#b00', fontSize: 12 }}>{e}</li>
              ))}
            </ul>
          </div>
        )}
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
