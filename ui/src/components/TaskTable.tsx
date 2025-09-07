import React from 'react'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'

export default function TaskTable({ tasks }: { tasks: TaskRow[] }) {
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
            <tr key={t.taskId}>
              <td>{t.taskName}</td>
              <td>{t.start}</td>
              <td>{t.finish}</td>
              <td style={{ textAlign: 'right' }}>{t.progressPercent ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
