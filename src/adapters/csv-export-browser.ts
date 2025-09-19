import type { TaskRow, ImportError } from '../../evm-mvp-sprint1/src.types'

export function toCsvBrowser(tasks: TaskRow[]): string {
  const headers = [
    'ProjectName','TaskID','TaskName','Start','Finish','DurationDays','ProgressPercent','ResourceType','ContractorName','UnitCost','ContractAmount','PlannedCost','ActualCost','ActualStart','ActualFinish','Dependencies','Notes'
  ]
  const esc = (s: string | number | undefined | null) => {
    if (s == null) return ''
    const t = String(s)
    if (t.includes(',') || t.includes('"') || t.includes('\n')) return '"' + t.replace(/"/g, '""') + '"'
    return t
  }
  const lines = [headers.join(',')]
  for (const t of tasks) {
    const deps = (t.predIds && t.predIds.length) ? t.predIds.join(',') : ''
    const row = [
      t.projectName,
      t.taskId,
      t.taskName,
      t.start,
      t.finish,
      t.durationDays,
      t.progressPercent,
      t.resourceType,
      t.contractorName,
      t.unitCost,
      t.contractAmount,
      t.plannedCost,
      t.actualCost,
      t.actualStart,
      t.actualFinish,
      deps,
      t.notes,
    ].map(esc)
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}

export function triggerDownloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export only import errors to CSV for auditing.
// Columns: Row,Column,Message,Value
export function errorsToCsv(errors: ImportError[]): string {
  const headers = ['Row','Column','Message','Value']
  const esc = (s: string | number | undefined | null) => {
    if (s == null) return ''
    const t = String(s)
    if (t.includes(',') || t.includes('"') || t.includes('\n')) return '"' + t.replace(/"/g, '""') + '"'
    return t
  }
  const lines = [headers.join(',')]
  for (const e of errors) {
    const row = [e.row, e.column ?? '', e.message ?? '', e.value ?? ''].map(esc)
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}
