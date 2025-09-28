import React from 'react'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'
import { useI18n } from '../i18n/i18n'

export default function TaskTable({ tasks, selectedIds = [], onSelect }: { tasks: TaskRow[]; selectedIds?: (string|number)[]; onSelect?: (ids: (string|number)[]) => void }) {
  const handleClick = (e: React.MouseEvent, id: number) => {
    if (!onSelect) return
    const sid = String(id)
    const curr = selectedIds.map(String)
    if (e.metaKey || e.ctrlKey) {
      if (curr.includes(sid)) onSelect(curr.filter(x => x !== sid))
      else onSelect([...curr, sid])
    } else {
      onSelect([sid])
    }
  }
  return (
    <div>
      <div className="panel-title">{useI18n().t('panels.tasks')}</div>
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
          {tasks.map((t) => {
            const sel = selectedIds.map(String).includes(String(t.taskId))
            return (
              <tr key={t.taskId} className={sel ? 'row-selected' : ''} onClick={(e) => handleClick(e, t.taskId)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                <td>{t.taskName}</td>
                <td>{t.start}</td>
                <td>{t.finish}</td>
                <td style={{ textAlign: 'right' }}>{t.progressPercent ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
