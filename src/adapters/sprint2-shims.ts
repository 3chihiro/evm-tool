// Sprint2 shims: keep the same interface so UI can switch later.

export type GanttCfg = { pxPerDay: number }

export function buildTripleHeader(startISO: string, endISO: string, cfg: GanttCfg) {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const days = Math.max(1, Math.ceil((+end - +start) / 86400000))
  const segments = Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const x = i * cfg.pxPerDay
    return {
      date: d.toISOString().slice(0, 10),
      x,
      w: cfg.pxPerDay,
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      day: String(d.getDate()).padStart(2, '0'),
      weekday: ['日','月','火','水','木','金','土'][d.getDay()],
    }
  })

  // group by ym
  const ymMap = new Map<string, { label: string; x: number; w: number }>()
  segments.forEach((s) => {
    const g = ymMap.get(s.ym)
    if (!g) ymMap.set(s.ym, { label: s.ym, x: s.x, w: s.w })
    else g.w += s.w
  })

  return {
    yearMonth: Array.from(ymMap.values()),
    day: segments.map((s) => ({ label: s.day, x: s.x, w: s.w })),
    weekday: segments.map((s) => ({ label: s.weekday, x: s.x, w: s.w })),
  }
}

export function dateToX(dateISO: string, chartStartISO: string, cfg: GanttCfg) {
  const d = new Date(dateISO)
  const s = new Date(chartStartISO)
  const diffDays = Math.floor((+d - +s) / 86400000)
  return Math.max(0, diffDays * cfg.pxPerDay)
}

export function xToDate(x: number, chartStartISO: string, cfg: GanttCfg) {
  const s = new Date(chartStartISO)
  const days = Math.max(0, Math.round(x / cfg.pxPerDay))
  const d = new Date(s)
  d.setDate(s.getDate() + days)
  return d.toISOString().slice(0, 10)
}

type Task = { id: string; name: string; start: string; end: string; progress: number }

export function planBar(task: Task, chartStartISO: string, cfg: GanttCfg) {
  const x = dateToX(task.start, chartStartISO, cfg)
  const w = Math.max(cfg.pxPerDay, dateToX(task.end, chartStartISO, cfg) - x)
  return { x, w }
}

export function actualBar(task: Task, chartStartISO: string, cfg: GanttCfg) {
  const planned = planBar(task, chartStartISO, cfg)
  const w = Math.max(4, Math.round(planned.w * Math.min(1, Math.max(0, task.progress))))
  return { x: planned.x, w }
}

export function buildTaskTable(tasks: Task[]) {
  return tasks.map((t) => ({ name: t.name, start: t.start, end: t.end, progress: Math.round(t.progress * 100) }))
}

export function formatJPY(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n)
}

export function computeEvmStub(tasks: Task[]) {
  // simple fixed/dummy computation preserving interface
  const PV = 1_000_000
  const EV = 800_000
  const AC = 900_000
  const SV = EV - PV
  const CV = EV - AC
  const SPI = PV ? EV / PV : 0
  const CPI = AC ? EV / AC : 0
  return { PV, EV, AC, SV, CV, SPI, CPI }
}

