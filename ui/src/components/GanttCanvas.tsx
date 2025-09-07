import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildTripleHeader, dateToX, planBar, actualBar, xToDate } from '../../../src/adapters'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'
import type { Command } from '../lib/history'
import { hitTest, snapPx, type Hit, type DragKind } from '../lib/ganttHit'
import { isWorkingDayISO, DefaultCalendar } from '../../../evm-mvp-sprint1/evm'

type GTask = { id: string; name: string; start: string; end: string; progress: number }

const cfg = { pxPerDay: 16 }

export default function GanttCanvas({
  tasks,
  onTasksChange,
  selectedIds,
  onSelect,
}: {
  tasks: TaskRow[]
  onTasksChange: (cmd: Command<TaskRow[]>) => void
  selectedIds: (string | number)[]
  onSelect: (ids: (string | number)[]) => void
}) {
  const headerRef = useRef<HTMLCanvasElement | null>(null)
  const bodyRef = useRef<HTMLCanvasElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState<number>(900)
  const hitsRef = useRef<Hit[]>([])
  const [hover, setHover] = useState<{ id: string; kind: DragKind } | null>(null)
  const dragRef = useRef<{
    kind: DragKind
    id: string
    startX: number
    base: { start: string; end: string }
    multiIds: string[]
  } | null>(null)
  const [preview, setPreview] = useState<Map<string, { start: string; end: string }>>(new Map())
  const [violations, setViolations] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const autoScrollReq = useRef<number | null>(null)
  const autoScrollDir = useRef<0 | -1 | 1>(0)

  // ローカルデモ用タスク（CSV未読み込み時の編集保持）
  const [demo, setDemo] = useState<GTask[] | null>(null)
  useEffect(() => {
    if (tasks.length === 0 && demo == null) {
      setDemo([
        { id: 'T1', name: '企画', start: '2024-01-01', end: '2024-01-05', progress: 0.6 },
        { id: 'T2', name: '設計', start: '2024-01-03', end: '2024-01-10', progress: 0.3 },
        { id: 'T3', name: '実装', start: '2024-01-08', end: '2024-01-15', progress: 0.1 },
      ])
    }
    if (tasks.length > 0 && demo != null) {
      // CSV読込後はデモ状態を解除
      setDemo(null)
    }
  }, [tasks, demo])

  const baseDisplay: GTask[] = useMemo(() => {
    const source = tasks.length
      ? tasks.map((t) => ({
          id: String(t.taskId),
          name: t.taskName,
          start: t.start,
          end: t.finish,
          progress: Math.max(0, Math.min(1, (t.progressPercent ?? 0) / 100)),
        }))
      : demo ?? []
    return source
  }, [tasks, demo])

  const displayTasks: GTask[] = useMemo(() => {
    if (!preview.size) return baseDisplay
    return baseDisplay.map((t) => {
      const p = preview.get(t.id)
      return p ? { ...t, start: p.start, end: p.end } : t
    })
  }, [baseDisplay, preview])

  const [initStart, initEnd] = useMemo(() => {
    const src = tasks.length ? tasks : (demo ?? [])
    if (!src.length) return ['2023-12-30', '2024-01-20']
    const startsAll = src.map((t: any) => new Date(t.start))
    const finishesAll = src.map((t: any) => new Date(t.finish))
    const starts = startsAll.filter((d: Date) => Number.isFinite(+d))
    const finishes = finishesAll.filter((d: Date) => Number.isFinite(+d))
    if (!starts.length || !finishes.length) return ['2023-12-30', '2024-01-20']
    const minS = new Date(Math.min(...starts.map((d: Date) => +d)))
    const maxF = new Date(Math.max(...finishes.map((d: Date) => +d)))
    if (!Number.isFinite(+minS) || !Number.isFinite(+maxF)) return ['2023-12-30', '2024-01-20']
    // pad 2 days both sides
    const s = new Date(minS)
    s.setDate(s.getDate() - 2)
    const f = new Date(maxF)
    f.setDate(f.getDate() + 2)
    try {
      return [s.toISOString().slice(0, 10), f.toISOString().slice(0, 10)] as const
    } catch {
      return ['2023-12-30', '2024-01-20']
    }
  }, [tasks, demo])

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

  // Business-day snap helper
  const snapWorkingDay = (iso: string, direction: -1 | 1): string => {
    let d = new Date(iso)
    let i = 0
    while (!isWorkingDayISO(d.toISOString().slice(0, 10), DefaultCalendar)) {
      d.setDate(d.getDate() + direction)
      if (++i > 10) break // safety
    }
    return d.toISOString().slice(0, 10)
  }

  // Validate dependencies for preview
  const validateDeps = (next: Map<string, { start: string; end: string }>): Set<string> => {
    const idToTask = new Map<string, TaskRow>(tasks.map((t) => [String(t.taskId), t]))
    const bad = new Set<string>()
    next.forEach((u, id) => {
      const row = idToTask.get(id)
      if (!row || !row.predIds || row.predIds.length === 0) return
      for (const pid of row.predIds) {
        const p = idToTask.get(String(pid))
        if (!p) continue
        const pf = p.finish
        if (u.start < pf) {
          bad.add(id)
          break
        }
      }
    })
    return bad
  }

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

    // 当たり判定の構築（計画バー基準。縦方向は計画バー帯に限定）
    hitsRef.current = displayTasks.map((t, i) => {
      const p = planBar(t as any, chartStart, cfg)
      return { id: t.id, x: p.x, y: i * rowH, w: p.w, row: i, yBar: i * rowH + 14, hBar: 10 }
    })

    // バーと行区切り
    displayTasks.forEach((t, i) => {
      const top = i * rowH
      // 実績バー（上段）
      const a = actualBar(t as any, chartStart, cfg)
      bctx.fillStyle = '#59A14F'
      bctx.fillRect(a.x, top + 4, a.w, 6)
      // 計画バー（黒）
      const p = planBar(t as any, chartStart, cfg)
      const isSel = selectedIds.map(String).includes(t.id)
      bctx.fillStyle = '#000000'
      bctx.fillRect(p.x, top + 14, p.w, 10)
      if (isSel) {
        bctx.strokeStyle = '#ff4081'
        bctx.lineWidth = 1.5
        bctx.strokeRect(p.x - 0.5, top + 13.5, p.w + 1, 11)
      }
      if (violations.has(t.id)) {
        bctx.strokeStyle = '#d32f2f'
        bctx.lineWidth = 2
        bctx.strokeRect(p.x - 1, top + 13, p.w + 2, 12)
      }
      // 行区切り線
      bctx.strokeStyle = '#efefef'
      bctx.beginPath()
      bctx.moveTo(0, top + rowH)
      bctx.lineTo(contentW, top + rowH)
      bctx.stroke()
    })
  }, [displayTasks, chartStart, chartEnd, containerW, violations])

  // ポインタイベント: hover/drag/select
  useEffect(() => {
    const cv = bodyRef.current
    const sc = scrollRef.current
    if (!cv || !sc) return
    let raf = 0

    const toLocal = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect()
      const sx = cv.width / rect.width
      const sy = cv.height / rect.height
      const mx = (e.clientX - rect.left + sc.scrollLeft) * sx
      const my = (e.clientY - rect.top + sc.scrollTop) * sy
      return { mx, my }
    }

    const onPointerMove = (e: PointerEvent) => {
      const { mx, my } = toLocal(e)
      const dragging = dragRef.current
      if (!dragging) {
        const h = hitTest(mx, my, hitsRef.current)
        setHover(h)
        cv.style.cursor = h ? (h.kind.includes('resize') ? 'ew-resize' : 'grab') : 'default'
        return
      }
      // autoscroll trigger near edges
      const contRect = sc.getBoundingClientRect()
      const threshold = 40
      if (e.clientX < contRect.left + threshold) autoScrollDir.current = -1
      else if (e.clientX > contRect.right - threshold) autoScrollDir.current = 1
      else autoScrollDir.current = 0
      if (autoScrollReq.current == null && autoScrollDir.current !== 0) {
        const step = () => {
          if (!dragRef.current) { autoScrollReq.current = null; return }
          if (autoScrollDir.current === 0) { autoScrollReq.current = null; return }
          sc.scrollLeft += autoScrollDir.current * 12
          autoScrollReq.current = requestAnimationFrame(step)
        }
        autoScrollReq.current = requestAnimationFrame(step)
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // ドラッグ距離→スナップ（日単位）
        const dx = mx - dragging.startX
        const snappedDx = snapPx(dx, cfg.pxPerDay)
        const deltaDays = Math.round(snappedDx / cfg.pxPerDay)

        // 対象ID集合
        const ids = dragging.multiIds
        const next = new Map(preview)
        ids.forEach((id) => {
          const base = baseDisplay.find((t) => t.id === id)!
          if (dragging.kind === 'move') {
            const s = new Date(base.start)
            s.setDate(s.getDate() + deltaDays)
            const f = new Date(base.end)
            f.setDate(f.getDate() + deltaDays)
            let sIso = s.toISOString().slice(0, 10)
            let fIso = f.toISOString().slice(0, 10)
            sIso = snapWorkingDay(sIso, deltaDays >= 0 ? 1 : -1)
            fIso = snapWorkingDay(fIso, deltaDays >= 0 ? 1 : -1)
            next.set(id, { start: sIso, end: fIso })
          } else if (dragging.kind === 'resize-left') {
            const s = new Date(base.start)
            s.setDate(s.getDate() + deltaDays)
            // 最小1日
            const f = new Date(base.end)
            if (+s >= +f) s.setDate(f.getDate() - 1)
            let sIso = s.toISOString().slice(0, 10)
            sIso = snapWorkingDay(sIso, deltaDays >= 0 ? 1 : -1)
            next.set(id, { start: sIso, end: base.end })
          } else if (dragging.kind === 'resize-right') {
            const f = new Date(base.end)
            f.setDate(f.getDate() + deltaDays)
            const s = new Date(base.start)
            if (+f <= +s) f.setDate(s.getDate() + 1)
            let fIso = f.toISOString().slice(0, 10)
            fIso = snapWorkingDay(fIso, deltaDays >= 0 ? 1 : -1)
            next.set(id, { start: base.start, end: fIso })
          }
        })
        const bad = validateDeps(next)
        setViolations(bad)
        setPreview(next)
      })
    }

    const onPointerDown = (e: PointerEvent) => {
      const { mx, my } = toLocal(e)
      const h = hitTest(mx, my, hitsRef.current)
      if (!h) return
      const clickedId = h.id
      const isAdd = e.metaKey || e.ctrlKey
      let newSelection = selectedIds.map(String)
      if (isAdd) {
        if (newSelection.includes(clickedId)) newSelection = newSelection.filter((id) => id !== clickedId)
        else newSelection = [...newSelection, clickedId]
      } else if (!newSelection.includes(clickedId)) {
        newSelection = [clickedId]
      }
      onSelect(newSelection)

      const multiIds = newSelection.length ? newSelection.map(String) : [clickedId]
      const base = baseDisplay.find((t) => t.id === clickedId)!
      dragRef.current = { kind: h.kind, id: clickedId, startX: mx, base: { start: base.start, end: base.end }, multiIds }
      cv.setPointerCapture(e.pointerId)
      cv.style.cursor = h.kind.includes('resize') ? 'ew-resize' : 'grabbing'
    }

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      cv.releasePointerCapture(e.pointerId)
      cv.style.cursor = 'default'
      autoScrollDir.current = 0
      if (autoScrollReq.current != null) { cancelAnimationFrame(autoScrollReq.current); autoScrollReq.current = null }
      if (!drag) return

      const next = new Map(preview)
      const updates = Array.from(next.entries()) // [id, {start,end}]
      setPreview(new Map())
      if (!updates.length) return
      if (violations.size > 0) {
        setToast('依存関係の制約により適用できません')
        setTimeout(() => setToast(null), 1500)
        setViolations(new Set())
        return
      }

      if (tasks.length > 0) {
        const cmd: Command<TaskRow[]> = {
          apply: (ts) => ts.map((row) => {
            const id = String(row.taskId)
            const u = next.get(id)
            if (!u) return row
            return { ...row, start: u.start, finish: u.end }
          }),
          revert: (ts) => ts.map((row) => {
            const id = String(row.taskId)
            if (drag.multiIds.includes(id)) {
              // 元に戻す: baseDisplay に戻す
              const b = baseDisplay.find((t) => t.id === id)!
              return { ...row, start: b.start, finish: b.end }
            }
            return row
          }),
        }
        onTasksChange(cmd)
      } else if (demo) {
        // CSV未読み込み時はローカルデモ配列を更新
        const upd = demo.map((d) => {
          const u = next.get(d.id)
          return u ? { ...d, start: u.start, end: u.end } : d
        })
        setDemo(upd)
      }
    }

    cv.addEventListener('pointermove', onPointerMove)
    cv.addEventListener('pointerdown', onPointerDown)
    cv.addEventListener('pointerup', onPointerUp)
    return () => {
      cv.removeEventListener('pointermove', onPointerMove)
      cv.removeEventListener('pointerdown', onPointerDown)
      cv.removeEventListener('pointerup', onPointerUp)
    }
  }, [baseDisplay, displayTasks, chartStart, onSelect, onTasksChange, preview, selectedIds])

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
      {toast && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#d32f2f' }}>{toast}</div>
      )}
    </div>
  )
}

// ユニットテスト用のエクスポート
export const __test = { dateToX }
