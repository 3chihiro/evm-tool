import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildTripleHeader, dateToX, planBar, actualBar, xToDate } from '../../../src/adapters'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'
import type { Command } from '../lib/history'
import { hitTest, snapPx, type Hit, type DragKind } from '../lib/ganttHit'
import { isWorkingDayISO, type Calendar } from '../../../evm-mvp-sprint1/evm'

type GTask = { id: string; name: string; start: string; end: string; progress: number; aStart?: string; aEnd?: string }

const cfg = { pxPerDay: 16 }

export default function GanttCanvas({
  tasks,
  onTasksChange,
  selectedIds,
  onSelect,
  calendar,
}: {
  tasks: TaskRow[]
  onTasksChange: (cmd: Command<TaskRow[]>) => void
  selectedIds: (string | number)[]
  onSelect: (ids: (string | number)[]) => void
  calendar: Calendar
}) {
  const headerRef = useRef<HTMLCanvasElement | null>(null)
  const bodyRef = useRef<HTMLCanvasElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState<number>(900)
  const hitsRef = useRef<Hit[]>([])
  const aHitsRef = useRef<Hit[]>([])
  const [hover, setHover] = useState<{ id: string; kind: DragKind } | null>(null)
  const dragRef = useRef<{
    kind: DragKind
    id: string
    startX: number
    base: { start: string; end: string }
    multiIds: string[]
    cancelled?: boolean
    bar: 'plan' | 'actual'
  } | null>(null)
  const [preview, setPreview] = useState<Map<string, { start: string; end: string }>>(new Map())
  const [aPreview, setAPreview] = useState<Map<string, { aStart?: string; aEnd?: string; progress?: number }>>(new Map())
  const [hoverBar, setHoverBar] = useState<'plan' | 'actual' | null>(null)
  const [tip, setTip] = useState<{ type: 'plan' | 'actual'; id: string; x: number; y: number } | null>(null)
  const [violations, setViolations] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const autoScrollReq = useRef<number | null>(null)
  const autoScrollDir = useRef<0 | -1 | 1>(0)
  // 依存連動トグル（デフォルトON）
  const [linkDeps, setLinkDeps] = useState<boolean>(() => {
    try { const v = localStorage.getItem('evm_link_deps'); return v == null ? true : v === '1' } catch { return true }
  })
  useEffect(() => { try { localStorage.setItem('evm_link_deps', linkDeps ? '1' : '0') } catch {} }, [linkDeps])
  // 実績も連動（デフォルトON）
  const [linkActual, setLinkActual] = useState<boolean>(() => {
    try { const v = localStorage.getItem('evm_link_actual'); return v == null ? true : v === '1' } catch { return true }
  })
  useEffect(() => { try { localStorage.setItem('evm_link_actual', linkActual ? '1' : '0') } catch {} }, [linkActual])

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
          aStart: t.actualStart,
          aEnd: t.actualFinish,
        }))
      : demo ?? []
    return source
  }, [tasks, demo])

  const displayTasks: GTask[] = useMemo(() => {
    return baseDisplay.map((t) => {
      const p = preview.get(t.id)
      const ap = aPreview.get(t.id)
      return {
        ...t,
        start: p?.start ?? t.start,
        end: p?.end ?? t.end,
        aStart: ap?.aStart ?? t.aStart,
        aEnd: ap?.aEnd ?? t.aEnd,
        progress: ap?.progress ?? t.progress,
      }
    })
  }, [baseDisplay, preview, aPreview])

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

  // 依存関係（predIds）から「後続タスク」マップを構築（id -> 直接の後続タスクID配列）
  const succMap = useMemo(() => {
    const map = new Map<string, string[]>()
    tasks.forEach((row) => {
      const sid = String(row.taskId)
      const preds = row.predIds ?? []
      preds.forEach((pid) => {
        const key = String(pid)
        const arr = map.get(key) ?? []
        arr.push(sid)
        map.set(key, arr)
      })
    })
    return map
  }, [tasks])

  // 先行（pred）マップ: id -> 直接の先行ID配列
  const predMap = useMemo(() => {
    const map = new Map<string, string[]>()
    tasks.forEach((row) => {
      const sid = String(row.taskId)
      const preds = row.predIds ?? []
      map.set(sid, preds.map((p) => String(p)))
    })
    return map
  }, [tasks])

  // 与えられたID集合に対し、全ての後続タスク（推移閉包）を含めた集合を返す
  const expandWithDependents = React.useCallback((ids: string[]): string[] => {
    const res = new Set<string>(ids)
    const stack = [...ids]
    while (stack.length) {
      const cur = stack.pop() as string
      const children = succMap.get(cur) ?? []
      for (const c of children) {
        if (!res.has(c)) { res.add(c); stack.push(c) }
      }
    }
    return Array.from(res)
  }, [succMap])

  // 閉包選択ヘルパ: 後続/先行 いずれか方向の推移閉包を返す
  const getSuccClosure = React.useCallback((ids: string[]): string[] => expandWithDependents(ids), [expandWithDependents])
  const getPredClosure = React.useCallback((ids: string[]): string[] => {
    const res = new Set<string>(ids)
    const stack = [...ids]
    while (stack.length) {
      const cur = stack.pop() as string
      const preds = predMap.get(cur) ?? []
      for (const p of preds) { if (!res.has(p)) { res.add(p); stack.push(p) } }
    }
    return Array.from(res)
  }, [predMap])

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
    while (!isWorkingDayISO(d.toISOString().slice(0, 10), calendar)) {
      d.setDate(d.getDate() + direction)
      if (++i > 10) break // safety
    }
    return d.toISOString().slice(0, 10)
  }

  const addDaysISO = (iso: string, delta: number, snapDir: -1 | 1): string => {
    const d = new Date(iso)
    d.setDate(d.getDate() + delta)
    return snapWorkingDay(d.toISOString().slice(0,10), snapDir)
  }

  const diffDaysISO = (a: string, b: string): number => {
    return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
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
        // 同時移動プレビュー中のときは、先行タスクの新しい finish も考慮する
        const pf = next.get(String(pid))?.end ?? p.finish
        if (u.start < pf) {
          bad.add(id)
          break
        }
      }
    })
    return bad
  }

  // 依存関係(FS)を満たすように、提案された next マップを下流へ伝播して補正する
  const enforceFsConstraints = (nextIn: Map<string, { start: string; end: string }>, moveDir: -1 | 1): Map<string, { start: string; end: string }> => {
    const idToTask = new Map<string, TaskRow>(tasks.map((t) => [String(t.taskId), t]))
    const next = new Map(nextIn) // 作業用コピー（破壊しない）

    // 期間（日数）を保持するため、各 moved タスクについて元の差分をメモ
    const durDays = new Map<string, number>()
    next.forEach((u, id) => {
      const s = new Date(u.start)
      const f = new Date(u.end)
      durDays.set(id, Math.max(1, Math.round((+f - +s) / 86400000)))
    })

    // まず、移動対象自身が先行の終了より前に行かないようクランプ
    Array.from(next.keys()).forEach((id) => {
      const row = idToTask.get(id)
      if (!row) return
      const preds = row.predIds ?? []
      if (!preds.length) return
      const current = next.get(id) ?? { start: row.start, end: row.finish }
      let required = ''
      for (const pid of preds) {
        const pend = next.get(String(pid))?.end ?? idToTask.get(String(pid))?.finish
        if (!pend) continue
        if (!required || new Date(pend) > new Date(required)) required = pend
      }
      if (required && new Date(current.start) < new Date(required)) {
        const sIso = snapWorkingDay(required, 1)
        const dur = durDays.get(id) ?? Math.max(1, Math.round(((new Date(current.end).getTime()) - (new Date(current.start).getTime())) / 86400000))
        const e = new Date(sIso); e.setDate(e.getDate() + dur)
        const eIso = snapWorkingDay(e.toISOString().slice(0, 10), moveDir)
        next.set(id, { start: sIso, end: eIso })
      }
    })

    // moved（next に含まれる）ノードから下流へ辿る順序で調整
    const queue: string[] = Array.from(next.keys())
    const seen = new Set<string>()
    while (queue.length) {
      const cur = queue.shift() as string
      if (seen.has(cur)) continue
      seen.add(cur)
      const succs = succMap.get(cur) ?? []
      for (const sid of succs) {
        const row = idToTask.get(sid)
        if (!row) continue
        // 後続の新開始は、すべての先行の終了（更新後があればそれ）以上にする
        const preds = row.predIds ?? []
        const current = next.get(sid) ?? { start: row.start, end: row.finish }
        let minStart = current.start
        let required = ''
        for (const pid of preds) {
          const pend = next.get(String(pid))?.end ?? idToTask.get(String(pid))?.finish
          if (!pend) continue
          if (!required || new Date(pend) > new Date(required)) required = pend
        }
        if (required && new Date(minStart) < new Date(required)) {
          // クランプ: 開始=required（非稼働日の場合は次の稼働日にスナップ）
          const sIso = snapWorkingDay(required, 1)
          const dur = durDays.get(sid) ?? Math.max(1, Math.round(((new Date(current.end).getTime()) - (new Date(current.start).getTime())) / 86400000))
          const e = new Date(sIso); e.setDate(e.getDate() + dur)
          const eIso = snapWorkingDay(e.toISOString().slice(0, 10), moveDir)
          next.set(sid, { start: sIso, end: eIso })
          // この変更がさらに下流に影響するため、後続をキューに追加
          queue.push(sid)
        }
      }
    }
    return next
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
    // 非稼働日の背景塗り（週末＋祝日）
    const startDate = new Date(chartStart)
    daySegs.forEach((s, i) => {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      if (!isWorkingDayISO(iso, calendar)) {
        bctx.fillStyle = '#fafafa'
        bctx.fillRect(s.x, 0, s.w, bodyHeight)
      }
    })
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
    // 実績バーヒット（上段6px）
    aHitsRef.current = displayTasks.map((t, i) => {
      let ax: number, aw: number
      if (t.aStart && t.aEnd) {
        ax = dateToX(t.aStart, chartStart, cfg)
        aw = Math.max(4, dateToX(t.aEnd, chartStart, cfg) - ax)
      } else {
        const p = planBar(t as any, chartStart, cfg)
        aw = Math.max(4, Math.round(p.w * t.progress))
        ax = p.x
      }
      return { id: t.id, x: ax, y: i * rowH, w: aw, row: i, yBar: i * rowH + 4, hBar: 6 }
    })

    // 依存線の描画（計画FS: predecessor end → successor start）
    const idToIndex = new Map<string, number>()
    displayTasks.forEach((t, idx) => idToIndex.set(t.id, idx))
    // get predIds from original tasks prop
    const predMap = new Map<string, number[]>()
    tasks.forEach((row) => {
      if (row.predIds && row.predIds.length) predMap.set(String(row.taskId), row.predIds.map(Number))
    })
    bctx.save()
    bctx.strokeStyle = '#666'
    bctx.lineWidth = 1
    const sel = new Set(selectedIds.map(String))
    const hoverId = hover?.id
    const hoverNeighbors = new Set<string>()
    if (hoverId) {
      const preds = predMap.get(hoverId) ?? []
      preds.forEach((p) => hoverNeighbors.add(String(p)))
      const succs = succMap.get(hoverId) ?? []
      succs.forEach((s) => hoverNeighbors.add(String(s)))
    }
    displayTasks.forEach((t) => {
      const preds = predMap.get(t.id)
      if (!preds) return
      const toPlan = planBar(t as any, chartStart, cfg)
      const toX = toPlan.x
      const toY = (idToIndex.get(t.id) ?? 0) * rowH + 19 // plan band center
      preds.forEach((pid) => {
        const pIdx = idToIndex.get(String(pid))
        if (pIdx == null) return
        const pTask = displayTasks[pIdx]
        const pPlan = planBar(pTask as any, chartStart, cfg)
        const fromX = pPlan.x + pPlan.w
        const fromY = pIdx * rowH + 19
        // violation if successor starts before predecessor end (by date)
        const isBad = new Date(t.start) < new Date(pTask.end)
        const isSel = sel.has(t.id) || sel.has(String(pid))
        const isHoverRel = !!hoverId && (hoverId === t.id || hoverId === String(pid) || hoverNeighbors.has(t.id) || hoverNeighbors.has(String(pid)))
        bctx.strokeStyle = isBad ? '#d32f2f' : (isSel ? '#1976d2' : (isHoverRel ? '#999' : '#666'))
        bctx.lineWidth = isSel ? 2 : (isHoverRel ? 1.5 : 1)
        // polyline: from -> (toX-10, fromY) -> (toX-10, toY) -> (toX, toY)
        bctx.beginPath()
        bctx.moveTo(fromX, fromY)
        bctx.lineTo(toX - 10, fromY)
        bctx.lineTo(toX - 10, toY)
        bctx.lineTo(toX, toY)
        bctx.stroke()
      })
    })
    bctx.restore()

    // バーと行区切り
    displayTasks.forEach((t, i) => {
      const top = i * rowH
      // 実績バー（上段）
      let a = actualBar(t as any, chartStart, cfg)
      if (t.aStart && t.aEnd) {
        const ax = dateToX(t.aStart, chartStart, cfg)
        const aw = Math.max(4, dateToX(t.aEnd, chartStart, cfg) - ax)
        a = { x: ax, w: aw }
      }
      bctx.fillStyle = '#59A14F'
      bctx.fillRect(a.x, top + 4, a.w, 6)
      // 実績グリップ表示
      bctx.fillStyle = '#2e7d32'
      bctx.fillRect(a.x - 2, top + 4, 4, 6)
      bctx.fillRect(a.x + a.w - 2, top + 4, 4, 6)
      // 計画バー（黒）
      const p = planBar(t as any, chartStart, cfg)
      const isSel = selectedIds.map(String).includes(t.id)
      bctx.fillStyle = '#000000'
      bctx.fillRect(p.x, top + 14, p.w, 10)
      // グリップ表示（左右端）
      bctx.fillStyle = '#666'
      bctx.fillRect(p.x - 2, top + 14, 4, 10)
      bctx.fillRect(p.x + p.w - 2, top + 14, 4, 10)
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
        // 先に実績バーを優先して判定
        const ha = hitTest(mx, my, aHitsRef.current)
        if (ha) {
          setHover(ha)
          setHoverBar('actual')
          setTip({ type: 'actual', id: ha.id, x: mx + 10, y: my + 10 })
          cv.style.cursor = ha.kind.includes('resize') ? 'ew-resize' : 'grab'
          return
        }
        const h = hitTest(mx, my, hitsRef.current)
        setHover(h)
        setHoverBar(h ? 'plan' : null)
        setTip(h ? { type: 'plan', id: h.id, x: mx + 10, y: my + 10 } : null)
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
        if (dragging.bar === 'plan') {
          let next = new Map(preview)
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
          // 先行→後続への制約を満たすよう補正（移動/左右リサイズ時）
          if (dragging.kind === 'move' || dragging.kind === 'resize-right' || dragging.kind === 'resize-left') {
            next = enforceFsConstraints(next, deltaDays >= 0 ? 1 : -1)
          }
          const bad = linkDeps ? validateDeps(next) : validateDeps(next)
          setViolations(bad)
          setPreview(next)
          // 実績連動: 計画の変化量に応じて aStart/aEnd をプレビュー更新
          if (linkActual) {
            const nextA = new Map(aPreview)
            next.forEach((u, id) => {
              const base = baseDisplay.find(t => t.id === id)
              if (!base) return
              const delta = diffDaysISO(u.start, base.start)
              if (delta === 0) return
              if (base.aStart || base.aEnd) {
                const sIso = base.aStart ? addDaysISO(base.aStart, delta, delta >= 0 ? 1 : -1) : undefined
                const eIso = base.aEnd ? addDaysISO(base.aEnd!, delta, delta >= 0 ? 1 : -1) : undefined
                nextA.set(id, { aStart: sIso, aEnd: eIso, progress: base.progress })
              }
            })
            setAPreview(nextA)
          }
        } else {
          // actual bar editing -> update actualStart/Finish and progress
          const nextA = new Map(aPreview)
          ids.forEach((id) => {
            const base = baseDisplay.find((t) => t.id === id)!
            const pbar = planBar(base as any, chartStart, cfg)
            const planDays = Math.max(1, Math.round(pbar.w / cfg.pxPerDay))
            let s = new Date(base.aStart ?? base.start)
            let f: Date
            if (base.aStart && base.aEnd) {
              f = new Date(base.aEnd)
            } else {
              f = new Date(base.start)
              f.setDate(f.getDate() + Math.max(1, Math.round(planDays * base.progress)))
            }
            if (dragging.kind === 'move') {
              s.setDate(s.getDate() + deltaDays)
              f.setDate(f.getDate() + deltaDays)
            } else if (dragging.kind === 'resize-left') {
              s.setDate(s.getDate() + deltaDays)
              if (+s >= +f) s.setDate(f.getDate() - 1)
            } else if (dragging.kind === 'resize-right') {
              f.setDate(f.getDate() + deltaDays)
              if (+f <= +s) f.setDate(s.getDate() + 1)
            }
            let sIso = snapWorkingDay(s.toISOString().slice(0, 10), deltaDays >= 0 ? 1 : -1)
            let fIso = snapWorkingDay(f.toISOString().slice(0, 10), deltaDays >= 0 ? 1 : -1)
            const dur = Math.max(1, Math.round((new Date(fIso).getTime() - new Date(sIso).getTime()) / 86400000))
            const prog = Math.min(1, Math.max(0, dur / planDays))
            nextA.set(id, { aStart: sIso, aEnd: fIso, progress: prog })
          })
          setAPreview(nextA)
        }
      })
    }

    const onPointerDown = (e: PointerEvent) => {
      const { mx, my } = toLocal(e)
      // 実績バー優先
      const ha = hitTest(mx, my, aHitsRef.current)
      let h = ha
      let bar: 'plan'|'actual' = 'actual'
      if (!h) {
        h = hitTest(mx, my, hitsRef.current)
        bar = 'plan'
      }
      if (!h) {
        // 何もない場所をクリック → 選択解除（修飾キーなし）
        if (!(e.metaKey || e.ctrlKey)) {
          onSelect([])
          setPreview(new Map())
          setAPreview(new Map())
          setTip(null)
        }
        return
      }
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

      let multiIds = newSelection.length ? newSelection.map(String) : [clickedId]
      // 計画バーの移動/右リサイズ時は、後続タスクも自動的に連動（トグルON時）
      if (linkDeps && bar === 'plan' && (h.kind === 'move' || h.kind === 'resize-right')) {
        multiIds = expandWithDependents(multiIds)
      }
      const base = baseDisplay.find((t) => t.id === clickedId)!
      dragRef.current = { kind: h.kind, id: clickedId, startX: mx, base: { start: base.start, end: base.end }, multiIds, cancelled: false, bar }
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

      let next = new Map(preview)
      const updates = Array.from(next.entries()) // [id, {start,end}]
      const nextA = new Map(aPreview)
      const updatesA = Array.from(nextA.entries())
      // Do not clear previews until we decide to commit/reject
      if ((drag.bar === 'plan' && (!updates.length || drag.cancelled)) || (drag.bar === 'actual' && (!updatesA.length || drag.cancelled))) {
        setPreview(new Map())
        setAPreview(new Map())
        setViolations(new Set())
        return
      }

      if (tasks.length > 0 && drag.bar === 'plan') {
        // Recompute constraints at drop-time to avoid race with state
        if (linkDeps && drag.kind === 'move') {
          const moved = next.get(drag.id)
          const baseStart = new Date(drag.base.start)
          const newStart = new Date(moved?.start ?? drag.base.start)
          const moveDir: -1 | 1 = newStart.getTime() - baseStart.getTime() >= 0 ? 1 : -1
          next = enforceFsConstraints(next, moveDir)
        }
        const badUp = validateDeps(next)
        if (badUp.size > 0) {
          setToast('依存関係の制約により適用できません')
          setTimeout(() => setToast(null), 1500)
          setViolations(new Set())
          setPreview(new Map())
          setAPreview(new Map())
          return
        }
        const linkA = linkActual
        const nextActual = new Map(aPreview)
        const cmd: Command<TaskRow[]> = {
          apply: (ts) => ts.map((row) => {
            const id = String(row.taskId)
            const u = next.get(id)
            let updated: TaskRow = row
            if (u) {
              updated = { ...updated, start: u.start, finish: u.end }
            }
            if (linkA) {
              const a = nextActual.get(id)
              if (a && (a.aStart || a.aEnd)) {
                updated = { ...updated, actualStart: a.aStart ?? updated.actualStart, actualFinish: a.aEnd ?? updated.actualFinish }
              }
            }
            return updated
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
        setPreview(new Map())
        setAPreview(new Map())
        setViolations(new Set())
      } else if (tasks.length > 0 && drag.bar === 'actual') {
        const cmd: Command<TaskRow[]> = {
          apply: (ts) => ts.map((row) => {
            const id = String(row.taskId)
            const u = nextA.get(id)
            if (!u) return row
            return { ...row, actualStart: u.aStart ?? row.actualStart, actualFinish: u.aEnd ?? row.actualFinish, progressPercent: Math.round(((u.progress ?? baseDisplay.find(t=>t.id===id)?.progress ?? 0) * 100)) }
          }),
          revert: (ts) => ts.map((row) => row),
        }
        onTasksChange(cmd)
        setPreview(new Map())
        setAPreview(new Map())
        setViolations(new Set())
      } else if (demo && drag.bar === 'plan') {
        // CSV未読み込み時はローカルデモ配列を更新
        const upd = demo.map((d) => {
          const u = next.get(d.id)
          return u ? { ...d, start: u.start, end: u.end } : d
        })
        setDemo(upd)
        setPreview(new Map())
        setAPreview(new Map())
        setViolations(new Set())
      } else if (demo && drag.bar === 'actual') {
        const upd = demo.map((d) => {
          const u = nextA.get(d.id)
          return u ? { ...d, aStart: u.aStart, aEnd: u.aEnd, progress: u.progress ?? d.progress } : d
        })
        setDemo(upd)
        setPreview(new Map())
        setAPreview(new Map())
        setViolations(new Set())
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

  // Keyboard operations: move/resize with arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ESCでドラッグ中止 & プレビュー廃棄
      if (e.key === 'Escape') {
        if (dragRef.current) {
          dragRef.current.cancelled = true
          setPreview(new Map())
        } else if (selectedIds.length) {
          // ESCで選択解除（ドラッグしていない場合）
          onSelect([])
        }
        return
      }
      if (!selectedIds.length) return
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      // 矢印キーでの移動時も、後続タスク連動を適用（トグルON時、Resizeは除外）
      const baseIds = selectedIds.map(String)
      const ids = linkDeps ? expandWithDependents(baseIds) : baseIds
      const step = e.shiftKey ? 5 : 1
      const applyMove = (delta: number) => {
        let next = new Map<string, { start: string; end: string }>()
        ids.forEach((id) => {
          const base = baseDisplay.find((t) => t.id === id)
          if (!base) return
          const s = new Date(base.start); s.setDate(s.getDate() + delta)
          const f = new Date(base.end); f.setDate(f.getDate() + delta)
          let sIso = s.toISOString().slice(0, 10)
          let fIso = f.toISOString().slice(0, 10)
          sIso = snapWorkingDay(sIso, delta >= 0 ? 1 : -1)
          fIso = snapWorkingDay(fIso, delta >= 0 ? 1 : -1)
          next.set(id, { start: sIso, end: fIso })
        })
        // 先行→後続制約を満たすよう補正（トグルON時のみ）
        if (linkDeps) next = enforceFsConstraints(next, delta >= 0 ? 1 : -1)
        const bad = validateDeps(next)
        if (bad.size) { setToast('依存関係の制約により適用できません'); setTimeout(() => setToast(null), 1500); return }
        // 実績連動: 実績を同じシフト分動かす
        let nextA: Map<string, { aStart?: string; aEnd?: string }>|null = null
        if (linkActual) {
          nextA = new Map()
          next.forEach((u, id) => {
            const base = baseDisplay.find(t => t.id === id)
            if (!base) return
            const shift = diffDaysISO(u.start, base.start)
            if (shift === 0) return
            if (base.aStart || base.aEnd) {
              const sIso = base.aStart ? addDaysISO(base.aStart, shift, shift >= 0 ? 1 : -1) : undefined
              const eIso = base.aEnd ? addDaysISO(base.aEnd!, shift, shift >= 0 ? 1 : -1) : undefined
              nextA!.set(id, { aStart: sIso, aEnd: eIso })
            }
          })
        }
        commitUpdate(next, nextA)
      }
      const applyResize = (edge: 'left' | 'right', delta: number) => {
        let next = new Map<string, { start: string; end: string }>()
        ids.forEach((id) => {
          const base = baseDisplay.find((t) => t.id === id)
          if (!base) return
          if (edge === 'left') {
            const s = new Date(base.start); s.setDate(s.getDate() + delta)
            const f = new Date(base.end)
            if (+s >= +f) s.setDate(f.getDate() - 1)
            let sIso = s.toISOString().slice(0, 10)
            sIso = snapWorkingDay(sIso, delta >= 0 ? 1 : -1)
            next.set(id, { start: sIso, end: base.end })
          } else {
            const f = new Date(base.end); f.setDate(f.getDate() + delta)
            const s = new Date(base.start)
            if (+f <= +s) f.setDate(s.getDate() + 1)
            let fIso = f.toISOString().slice(0, 10)
            fIso = snapWorkingDay(fIso, delta >= 0 ? 1 : -1)
            next.set(id, { start: base.start, end: fIso })
          }
        })
        // リサイズ時もFS制約に合わせてクランプ（自身/後続）（トグルON時のみ）
        if (linkDeps) next = enforceFsConstraints(next, delta >= 0 ? 1 : -1)
        const bad = validateDeps(next)
        if (bad.size) { setToast('依存関係の制約により適用できません'); setTimeout(() => setToast(null), 1500); return }
        let nextA: Map<string, { aStart?: string; aEnd?: string }>|null = null
        if (linkActual) {
          nextA = new Map()
          next.forEach((u, id) => {
            const base = baseDisplay.find(t => t.id === id)
            if (!base) return
            const shift = diffDaysISO(u.start, base.start)
            if (shift === 0) return
            if (base.aStart || base.aEnd) {
              const sIso = base.aStart ? addDaysISO(base.aStart, shift, shift >= 0 ? 1 : -1) : undefined
              const eIso = base.aEnd ? addDaysISO(base.aEnd!, shift, shift >= 0 ? 1 : -1) : undefined
              nextA!.set(id, { aStart: sIso, aEnd: eIso })
            }
          })
        }
        commitUpdate(next, nextA)
      }
      const commitUpdate = (next: Map<string, { start: string; end: string }>, nextA?: Map<string, { aStart?: string; aEnd?: string }> | null) => {
        if (tasks.length > 0) {
          const cmd: Command<TaskRow[]> = {
            apply: (ts) => ts.map((row) => {
              const id = String(row.taskId)
              const u = next.get(id)
              let updated: TaskRow = row
              if (u) updated = { ...updated, start: u.start, finish: u.end }
              const a = nextA?.get(id)
              if (a && (a.aStart || a.aEnd)) updated = { ...updated, actualStart: a.aStart ?? updated.actualStart, actualFinish: a.aEnd ?? updated.actualFinish }
              return updated
            }),
            revert: (ts) => ts.map((row) => row),
          }
          onTasksChange(cmd)
        } else if (demo) {
          const upd = demo.map((d) => {
            const u = next.get(d.id)
            return u ? { ...d, start: u.start, end: u.end } : d
          })
          setDemo(upd)
        }
      }

      // No modifier: move, Alt: right-edge resize, Alt+Shift: left-edge resize
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (e.altKey && e.shiftKey) applyResize('left', -step)
        else if (e.altKey) applyResize('right', -step)
        else applyMove(-step)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.altKey && e.shiftKey) applyResize('left', +step)
        else if (e.altKey) applyResize('right', +step)
        else applyMove(+step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, baseDisplay, tasks, demo, expandWithDependents])

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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
          <label style={{ fontSize: 12, color: '#444', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={linkDeps} onChange={(e) => setLinkDeps(e.target.checked)} /> 依存連動
          </label>
          <button className="btn" style={{ fontSize: 12 }} onClick={() => onSelect(getPredClosure(selectedIds.map(String)))}>先行選択</button>
          <button className="btn" style={{ fontSize: 12 }} onClick={() => onSelect(getSuccClosure(selectedIds.map(String)))}>後続選択</button>
        </div>
      </div>
      <div className="gantt-scroll" ref={scrollRef}>
        <div className="gantt-header">
          <canvas ref={headerRef} className="gantt-canvas" style={{ height: 60 }} />
        </div>
        <canvas ref={bodyRef} className="gantt-canvas" style={{ height: '240px' }} />
        {tip && (
          <div style={{ position: 'absolute', left: Math.max(0, tip.x + 8), top: Math.max(0, tip.y + 8), background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', pointerEvents: 'none', fontSize: 12 }}>
            {(() => {
              const t = displayTasks.find(d => d.id === tip.id)
              if (!t) return null
              const planDays = Math.max(1, Math.round((new Date(t.end).getTime() - new Date(t.start).getTime())/86400000))
              if (tip.type === 'actual') {
                const as = t.aStart ?? t.start
                const af = t.aEnd ?? t.end
                const aDays = Math.max(1, Math.round((new Date(af).getTime() - new Date(as).getTime())/86400000))
                const pct = Math.round((t.progress ?? 0) * 100)
                return (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>実績</div>
                    <div>{as} 〜 {af}</div>
                    <div>実工期: {aDays}日 / 進捗: {pct}%</div>
                  </div>
                )
              } else {
                const pct = Math.round((t.progress ?? 0) * 100)
                return (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>計画</div>
                    <div>{t.start} 〜 {t.end}</div>
                    <div>工期: {planDays}日 / 進捗: {pct}%</div>
                  </div>
                )
              }
            })()}
          </div>
        )}
      </div>
      {toast && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#d32f2f' }}>{toast}</div>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: '#444' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={linkActual} onChange={(e) => setLinkActual(e.target.checked)} /> 実績連動
        </label>
      </div>
    </div>
  )
}

// ユニットテスト用のエクスポート
export const __test = { dateToX }
