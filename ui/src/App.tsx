import React, { useCallback, useMemo, useState } from 'react'
import GanttCanvas from './components/GanttCanvas'
import TaskTable from './components/TaskTable'
import EvmCard from './components/EvmCard'
import type { TaskRow } from '../../evm-mvp-sprint1/src.types'
import { parseCsvTextBrowser } from '../../src/adapters'

export default function App() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const res = parseCsvTextBrowser(text)
      setTasks(res.tasks)
      setErrors(res.errors.map((er) => `Row ${er.row} ${er.column ?? ''} ${er.message}`))
    }
    reader.readAsText(f, 'utf-8')
  }, [])

  const projectName = useMemo(() => tasks[0]?.projectName ?? '', [tasks])

  return (
    <div className="app-grid">
      <header className="header">
        <h1>EVM Tool UI Shell</h1>
        <div style={{ marginLeft: '16px', fontSize: 12, color: '#666' }}>{projectName && `（${projectName}）`}</div>
        <div style={{ marginLeft: 'auto' }}>
          <input type="file" accept=".csv" onChange={onFileChange} />
        </div>
      </header>
      <section className="gantt">
        <GanttCanvas tasks={tasks} />
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
    </div>
  )
}
