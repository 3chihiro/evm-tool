import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildTripleHeader, dateToX, planBar, actualBar } from '../../../src/adapters'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'

type GTask = { id: string; name: string; start: string; end: string; progress: number }

const cfg = { pxPerDay: 16 }

export default function GanttCanvas({ tasks }: { tasks: TaskRow[] }) {
  const headerRef = useRef<HTMLCanvasElement | null>(null)
  const bodyRef = useRef<HTMLCanvasElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState<number>(900)

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

  const [initStart, initEnd] = useMemo(() => {
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

  const [chartStart, setChartStart] = useState<string>(initStart)
  const [chartEnd, setChartEnd] = useState<string>(initEnd)

  // Reset range when tasks change significantly
  useEffect(() => {
    setChartStart(initStart)
    setChartEnd(initEnd)
  }, [initStart, initEnd])

  // Container width tracking (resize-aware)
  useEffect(() => {
    const update = () => {
      const el = scrollRef.current
      if (!el) return
      setContainerW(el.clientWidth || 900)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const headerCanvas = headerRef.current
    const bodyCanvas = bodyRef.current
    if (!headerCanvas || !bodyCanvas) return

    let hctx: CanvasRenderingContext2D | null = null
    let bctx: CanvasRenderingContext2D | null = null
    try {
      hctx = headerCanvas.getContext('2d') as CanvasRenderingContext2D | null
      bctx = bodyCanvas.getContext('2d') as CanvasRenderingContext2D | null
    } catch {
      return
    }
    if (!hctx || !bctx) return

    const start = new Date(chartStart)
    const end = new Date(chartEnd)
    const days = Math.max(1, Math.ceil((+end - +start) / 86400000))
    const contentW = Math.max(containerW, days * cfg.pxPerDay)
    const headerHeight = 60
    const rowH = 28
    const bodyHeight = displayTasks.length * rowH + 20

    headerCanvas.width = contentW
    headerCanvas.height = headerHeight
    bodyCanvas.width = contentW
    bodyCanvas.height = bodyHeight
    // reflect layout width to allow horizontal scroll when needed
    headerCanvas.style.width = `${contentW}px`
    bodyCanvas.style.width = `${contentW}px`

    // ヘッダ描画
    hctx.clearRect(0, 0, contentW, headerHeight)
    const header = buildTripleHeader(chartStart, chartEnd, cfg)
    hctx.fillStyle = '#ffffff'
    hctx.fillRect(0, 0, contentW, headerHeight)
    hctx.strokeStyle = '#d0d0d0'
    hctx.strokeRect(0, 0, contentW, headerHeight)

    hctx.fillStyle = '#333'
    hctx.font = '12px sans-serif'
    let y = 14
    ;(['yearMonth', 'day', 'weekday'] as const).forEach((level, idx) => {
      const segments = (header as any)[level] as Array<{ label: string; x: number; w: number }>
      segments.forEach((s) => {
        hctx.fillText(s.label, s.x + 4, y)
        // グリッド枠
        hctx.strokeStyle = idx === 0 ? '#cccccc' : '#e6e6e6'
        hctx.strokeRect(s.x, (y - 12) + (level === 'yearMonth' ? 0 : level === 'day' ? 16 : 32), s.w, 16)
      })
      y += 16
    })

    // ボディ描画
    bctx.clearRect(0, 0, contentW, bodyHeight)

    // 縦グリッド（日単位）
    const daySegs = (header as any)['day'] as Array<{ label: string; x: number; w: number }>
    bctx.strokeStyle = '#f5f5f5'
    daySegs.forEach((s) => {
      bctx.beginPath()
      bctx.moveTo(s.x, 0)
      bctx.lineTo(s.x, bodyHeight)
      bctx.stroke()
    })
    // 月境界の強調線
    const ymSegs = (header as any)['yearMonth'] as Array<{ label: string; x: number; w: number }>
    bctx.save()
    bctx.strokeStyle = '#c8c8c8'
    bctx.lineWidth = 1.5
    ymSegs.forEach((s) => {
      bctx.beginPath()
      bctx.moveTo(s.x, 0)
      bctx.lineTo(s.x, bodyHeight)
      bctx.stroke()
    })
    bctx.restore()

    // バーと行区切り
    displayTasks.forEach((t, i) => {
      const top = i * rowH
      // 実績バー（上段）
      const a = actualBar(t as any, chartStart, cfg)
      bctx.fillStyle = '#59A14F'
      bctx.fillRect(a.x, top + 4, a.w, 6)
      // 計画バー（黒）
      const p = planBar(t as any, chartStart, cfg)
      bctx.fillStyle = '#000000'
      bctx.fillRect(p.x, top + 14, p.w, 10)
      // 行区切り線
      bctx.strokeStyle = '#efefef'
      bctx.beginPath()
      bctx.moveTo(0, top + rowH)
      bctx.lineTo(contentW, top + rowH)
      bctx.stroke()
    })
  }, [displayTasks, chartStart, chartEnd, containerW])

  // Horizontal range expansion on scroll edges
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const near = 80
      const atLeft = el.scrollLeft < near
      const atRight = el.scrollLeft + el.clientWidth > el.scrollWidth - near
      if (atLeft) {
        const d = new Date(chartStart)
        d.setDate(d.getDate() - 14)
        const iso = d.toISOString().slice(0, 10)
        if (iso !== chartStart) setChartStart(iso)
      } else if (atRight) {
        const d = new Date(chartEnd)
        d.setDate(d.getDate() + 14)
        const iso = d.toISOString().slice(0, 10)
        if (iso !== chartEnd) setChartEnd(iso)
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [chartStart, chartEnd])

  return (
    <div>
      <div className="panel-title">ガント</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 18, height: 6, background: '#59A14F', borderRadius: 2 }} />
          <span style={{ fontSize: 12, color: '#666' }}>実績（上段）</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 18, height: 10, background: '#000' }} />
          <span style={{ fontSize: 12, color: '#666' }}>計画（黒・下段）</span>
        </div>
      </div>
      <div className="gantt-scroll" ref={scrollRef}>
        <div className="gantt-header">
          <canvas ref={headerRef} className="gantt-canvas" style={{ height: 60 }} />
        </div>
        <canvas ref={bodyRef} className="gantt-canvas" style={{ height: '240px' }} />
      </div>
    </div>
  )
}

// ユニットテスト用のエクスポート
export const __test = { dateToX }
