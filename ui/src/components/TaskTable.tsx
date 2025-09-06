import React from 'react'

const tasks = [
  { id: 'T1', name: '企画', start: '2024-01-01', end: '2024-01-05', progress: 60 },
  { id: 'T2', name: '設計', start: '2024-01-03', end: '2024-01-10', progress: 30 },
  { id: 'T3', name: '実装', start: '2024-01-08', end: '2024-01-15', progress: 10 },
]

export default function TaskTable() {
  return (
    <div>
      <div className="panel-title">タスク一覧</div>
      <table className="table">
        <thead>
          <tr>
            <th>名前</th>
            <th>開始</th>
            <th>終了</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.start}</td>
              <td>{t.end}</td>
              <td style={{ textAlign: 'right' }}>{t.progress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

