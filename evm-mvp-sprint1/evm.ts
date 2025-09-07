export type JpResourceType = '社内' | '協力'

export type Calendar = {
  holidays?: string[] // YYYY-MM-DD
  offWeekdays?: number[] // 0(Sun)-6(Sat) treated as non-working
}

const DEFAULT_OFF = new Set([0, 6]) // 0=Sun, 6=Sat

export const DefaultCalendar: Calendar = { holidays: [], offWeekdays: [0,6] }

function isHoliday(dateISO: string, cal: Calendar): boolean {
  const h = cal.holidays ?? []
  return h.includes(dateISO)
}

export function isWorkingDayISO(dateISO: string, cal: Calendar = DefaultCalendar): boolean {
  const d = new Date(dateISO)
  const day = d.getDay()
  const off = new Set(cal.offWeekdays ?? Array.from(DEFAULT_OFF))
  if (off.has(day)) return false
  return !isHoliday(dateISO, cal)
}

export function clampDateISO(dateISO: string): string {
  // Normalize to YYYY-MM-DD (UTC slice)
  return new Date(dateISO).toISOString().slice(0, 10)
}

export function enumerateWorkingDays(startISO: string, endISO: string, cal: Calendar = DefaultCalendar): string[] {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const days: string[] = []
  const cur = new Date(start)
  while (+cur <= +end) {
    const iso = cur.toISOString().slice(0, 10)
    if (isWorkingDayISO(iso, cal)) days.push(iso)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function countWorkingDays(startISO: string, endISO: string, cal: Calendar = DefaultCalendar): number {
  if (new Date(startISO) > new Date(endISO)) return 0
  return enumerateWorkingDays(startISO, endISO, cal).length
}

export interface EvmTaskLike {
  start: string // YYYY-MM-DD
  finish: string // YYYY-MM-DD
  plannedCost?: number
  progressPercent?: number // 0-100
  actualCost?: number
  resourceType?: JpResourceType
  unitCost?: number
  contractAmount?: number
  durationDays?: number // optional explicit duration
}

function safeNumber(n: number | undefined): number {
  return Number.isFinite(n as number) ? (n as number) : 0
}

export function plannedTotalForTask(t: EvmTaskLike, cal: Calendar = DefaultCalendar): number {
  // Prefer explicit plannedCost if provided
  if (t.plannedCost != null && Number.isFinite(t.plannedCost)) return t.plannedCost as number

  const startISO = clampDateISO(t.start)
  const endISO = clampDateISO(t.finish)
  const wd = t.durationDays ?? countWorkingDays(startISO, endISO, cal)

  if (t.resourceType === '協力') {
    // Contractor: use contractAmount if available
    const contract = safeNumber(t.contractAmount)
    if (contract > 0) return contract
  }
  if (t.resourceType === '社内') {
    // In-house: unit cost per working day
    const unit = safeNumber(t.unitCost)
    if (unit > 0 && wd > 0) return unit * wd
  }

  // Fallbacks if resource type missing
  if (t.contractAmount && wd > 0) return t.contractAmount
  if (t.unitCost && wd > 0) return (t.unitCost as number) * wd
  return 0
}

export function plannedFractionAsOf(startISO: string, finishISO: string, asOfISO: string, cal: Calendar = DefaultCalendar): number {
  const s = new Date(startISO)
  const f = new Date(finishISO)
  const a = new Date(asOfISO)
  if (!(s <= f)) return 0
  const total = countWorkingDays(startISO, finishISO, cal)
  if (total <= 0) return 0
  if (a < s) return 0
  const upto = a < f ? a : f
  const uptoISO = upto.toISOString().slice(0, 10)
  const worked = countWorkingDays(startISO, uptoISO, cal)
  return Math.min(1, Math.max(0, worked / total))
}

export function dailyRateFromContract(contractAmount: number, durationDays: number): number {
  if (!Number.isFinite(contractAmount) || !Number.isFinite(durationDays) || durationDays <= 0) return 0
  return contractAmount / durationDays
}

export interface EvmResult {
  PV: number
  EV: number
  AC: number
  SV: number
  CV: number
  SPI: number
  CPI: number
}

function yenRound(n: number): number {
  return Math.round(n)
}

export function computeEVM(tasks: EvmTaskLike[], asOfISO: string, cal: Calendar = DefaultCalendar): EvmResult {
  let PV = 0
  let EV = 0
  let AC = 0

  for (const t of tasks) {
    const startISO = clampDateISO(t.start)
    const finishISO = clampDateISO(t.finish)
    const plannedTotal = plannedTotalForTask(t, cal)
    const frac = plannedFractionAsOf(startISO, finishISO, asOfISO, cal)
    PV += plannedTotal * frac

    const progress = safeNumber(t.progressPercent) / 100
    EV += plannedTotal * Math.min(1, Math.max(0, progress))

    AC += safeNumber(t.actualCost)
  }

  PV = yenRound(PV)
  EV = yenRound(EV)
  AC = yenRound(AC)
  const SV = EV - PV
  const CV = EV - AC
  const SPI = PV ? EV / PV : 0
  const CPI = AC ? EV / AC : 0
  return { PV, EV, AC, SV, CV, SPI, CPI }
}
