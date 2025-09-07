import React, { useEffect, useMemo, useRef } from 'react'
import { buildTripleHeader, dateToX, planBar, actualBar } from '../../../src/adapters'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'

type GTask = { id: string; name: string; start: string; end: string; progress: number }

const cfg = { pxPerDay: 16 }

export default function GanttCanvas({ tasks }: { tasks: TaskRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const displayTasks: GTask[] = useMemo(() => {
    if (!tasks.length) {
      return [
        { id: 'T1', name: '企画', start: '2024-01-01', end: '2024-01-05', progress: 0.6 },
        { id: 'T2', name: '設計', start: '2024-01-03', end: '2024-01-10', progress: 0.3 },
        { id: 'T3', name: '実装', start: '2024-01-08', end: '2024-01-15', progress: 0.1 },
      ]
    }
    return tasks.map((t) => ({
      id: String(t.taskId),
      name: t.taskName,
      start: t.start,
      end: t.finish,
      progress: Math.max(0, Math.min(1, (t.progressPercent ?? 0) / 100)),
    }))
  }, [tasks])

  const [chartStart, chartEnd] = useMemo(() => {
    if (!tasks.length) return ['2023-12-30', '2024-01-20']
    const starts = tasks.map((t) => new Date(t.start))
    const finishes = tasks.map((t) => new Date(t.finish))
    const minS = new Date(Math.min(...starts.map((d) => +d)))
    const maxF = new Date(Math.max(...finishes.map((d) => +d)))
    // pad 2 days both sides
    const s = new Date(minS)
    s.setDate(s.getDate() - 2)
    const f = new Date(maxF)
    f.setDate(f.getDate() + 2)
    return [s.toISOString().slice(0, 10), f.toISOString().slice(0, 10)] as const
  }, [tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
    } catch {
      // jsdom では HTMLCanvasElement.getContext が未実装のため、描画をスキップ
      return
    }
    if (!ctx) return
    const width = 900
    const headerHeight = 60
    const rowH = 28
    const height = headerHeight + displayTasks.length * rowH + 20
    canvas.width = width
    canvas.height = height

    ctx.clearRect(0, 0, width, height)

    // 三段ヘッダ描画
    const header = buildTripleHeader(chartStart, chartEnd, cfg)
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, width, headerHeight)
    ctx.strokeStyle = '#ddd'
    ctx.strokeRect(0, 0, width, headerHeight)

    ctx.fillStyle = '#333'
    ctx.font = '12px sans-serif'
    let y = 14
    ;['yearMonth', 'day', 'weekday'].forEach((level) => {
      const segments = (header as any)[level] as Array<{ label: string; x: number; w: number }>
      segments.forEach((s) => {
        ctx.fillText(s.label, s.x + 4, y)
        ctx.strokeStyle = '#eee'
        ctx.strokeRect(s.x, (y - 12) + (level === 'yearMonth' ? 0 : level === 'day' ? 16 : 32), s.w, 16)
      })
      y += 16
    })

    // 各行とバー描画
    displayTasks.forEach((t, i) => {
      const top = headerHeight + i * rowH
      // 計画バー（青）
      const p = planBar(t as any, chartStart, cfg)
      ctx.fillStyle = '#4C78A8'
      ctx.fillRect(p.x, top + 6, p.w, 10)
      // 実績バー（緑）— ダミー短尺
      const a = actualBar(t as any, chartStart, cfg)
      ctx.fillStyle = '#59A14F'
      ctx.fillRect(a.x, top + 18, a.w, 6)
      // 行区切り線
      ctx.strokeStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.moveTo(0, top + rowH)
      ctx.lineTo(width, top + rowH)
      ctx.stroke()
    })
  }, [displayTasks, chartStart, chartEnd])

  return (
    <div>
      <div className="panel-title">ガント</div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '240px' }} />
    </div>
  )
}

// ユニットテスト用のエクスポート
export const __test = { dateToX }
