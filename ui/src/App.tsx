import React from 'react'
import GanttCanvas from './components/GanttCanvas'
import TaskTable from './components/TaskTable'
import EvmCard from './components/EvmCard'

export default function App() {
  console.log('[renderer] App render')
  return (
    <div className="app-grid">
      <header className="header">
        <h1>EVM Tool UI Shell</h1>
      </header>
      <section className="gantt">
        <GanttCanvas />
      </section>
      <section className="tasks">
        <TaskTable />
      </section>
      <aside className="evm">
        <EvmCard />
      </aside>
    </div>
  )
}

