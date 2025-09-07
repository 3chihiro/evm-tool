import React, { useMemo, useState } from 'react'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'
import type { Command } from '../lib/history'
import { countWorkingDays, DefaultCalendar } from '../../../evm-mvp-sprint1/evm'

function iso(d?: string) { return d ?? '' }

export default function TaskDetailsPanel({ tasks, selectedIds, onTasksChange }: { tasks: TaskRow[]; selectedIds: (string|number)[]; onTasksChange: (cmd: Command<TaskRow[]>) => void }) {
  const current = useMemo(() => tasks.find(t => String(t.taskId) === String(selectedIds[0])), [tasks, selectedIds])
  const [mode, setMode] = useState<'manual'|'auto'>('manual')
  // Hooks must not be conditional: compute autoProgress safely even when no current
  const autoProgress = useMemo(() => current ? calculateAutoProgress(current) : 0, [current])

  if (!current) return <div className="panel-title">工程情報（タスクを選択してください）</div>

  const rules = getEditRules(current)

  const apply = (updates: Partial<TaskRow>) => {
    const id = String(current.taskId)
    const cmd: Command<TaskRow[]> = {
      apply: (ts) => ts.map(row => String(row.taskId) === id ? { ...row, ...updates } : row),
      revert: (ts) => ts,
    }
    onTasksChange(cmd)
  }

  const onDepsChange = (s: string) => {
    const arr = s.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n))
    apply({ predIds: arr.length ? arr : undefined })
  }

  return (
    <div>
      <div className="panel-title">工程情報</div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 1fr', gap: 8, alignItems: 'center' }}>
        <label>工程名</label>
        <input value={current.taskName} onChange={e => apply({ taskName: e.target.value })} />
        <label>依存（選択）</label>
        <div>
          <select multiple size={6}
            value={(current.predIds?.map(String) ?? [])}
            onChange={(e) => {
              const opts = Array.from(e.currentTarget.selectedOptions).map(o => Number(o.value)).filter(n => Number.isFinite(n))
              apply({ predIds: opts })
            }}
            style={{ minWidth: 200 }}
          >
            {tasks.filter(t => t.taskId !== current.taskId).map(t => (
              <option key={t.taskId} value={t.taskId}>{t.taskId}: {t.taskName}</option>
            ))}
          </select>
          <div style={{ marginTop: 4 }}>
            <button className="btn" onClick={() => apply({ predIds: [] })}>クリア</button>
          </div>
        </div>

        <label>計画開始</label>
        <input type="date" value={iso(current.start)} disabled={!rules.canEditPlan} onChange={e => apply({ start: e.target.value })} />
        <label>計画終了</label>
        <input type="date" value={iso(current.finish)} disabled={!rules.canEditPlan} onChange={e => apply({ finish: e.target.value })} />

        <label>実績開始</label>
        <input type="date" value={iso(current.actualStart)} disabled={!rules.canEditActual} onChange={e => apply({ actualStart: e.target.value })} />
        <label>実績終了</label>
        <input type="date" value={iso(current.actualFinish)} disabled={!rules.canEditActual} onChange={e => apply({ actualFinish: e.target.value })} />

        <label>進捗入力</label>
        <div>
          <label style={{ marginRight: 8 }}><input type="radio" name="pmode" checked={mode==='manual'} onChange={() => setMode('manual')} /> 手動</label>
          <label><input type="radio" name="pmode" checked={mode==='auto'} onChange={() => setMode('auto')} /> 自動</label>
        </div>
        {mode==='manual' ? (
          <div style={{ gridColumn: '1 / span 4', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min={0} max={100} value={current.progressPercent ?? 0} onChange={e => apply({ progressPercent: Math.max(0, Math.min(100, Number(e.target.value))) })} />
            <input type="range" min={0} max={100} value={current.progressPercent ?? 0} onChange={e => apply({ progressPercent: Number(e.target.value) })} />
            <span>%</span>
          </div>
        ) : (
          <div style={{ gridColumn: '1 / span 4', color: '#666' }}>自動計算: {autoProgress}%（実績/計画の稼働日比）</div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{rules.reason}</div>
    </div>
  )
}

function getEditRules(task: TaskRow) {
  if (!task.actualStart) {
    return { canEditPlan: true, canEditActual: false, reason: '未着手のため計画変更可能（実績は編集不可）' }
  }
  return { canEditPlan: false, canEditActual: true, reason: '着手済みのため計画固定（実績は編集可能）' }
}

function calculateAutoProgress(task: TaskRow): number {
  if (!task.actualStart) return 0
  if (task.actualFinish) return 100
  try {
    const total = countWorkingDays(task.start, task.finish, DefaultCalendar)
    const nowIso = new Date().toISOString().slice(0,10)
    const elapsed = countWorkingDays(task.actualStart, nowIso, DefaultCalendar)
    return Math.min(100, Math.round((elapsed/Math.max(1,total))*100))
  } catch {
    return 0
  }
}
